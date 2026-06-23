/**
 * @file ai.controller.ts
 * @description HTTP handlers for the AI assistant.
 */

import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../core/async-handler';
import { AppError } from '../../core/app-error';
import { aiEnabled } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { planAllowsAi, planDef, planAiLimit } from '../../config/plans';
import { AiService, type ChatMessage } from './ai.service';

export class AiController {
  private service = new AiService();

  /** Look up the company's plan to decide whether AI is included on it. */
  private async planFor(companyId: string): Promise<string> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    });
    return company?.plan ?? '';
  }

  /** Current calendar-month key, e.g. "2026-06". */
  private currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /** This month's AI message count for a company. */
  private async usageFor(companyId: string): Promise<number> {
    const row = await prisma.aiUsage.findUnique({
      where: { companyId_period: { companyId, period: this.currentPeriod() } },
    });
    return row?.count ?? 0;
  }

  /**
   * Whether the assistant is available to this user: the server must be configured
   * (ANTHROPIC_API_KEY) AND the company's plan must include AI.
   */
  status = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const plan = await this.planFor(req.user.companyId);
    const limit = planAiLimit(plan);
    const used = planAllowsAi(plan) ? await this.usageFor(req.user.companyId) : 0;
    res.json({
      enabled: aiEnabled && planAllowsAi(plan),
      planAllowsAi: planAllowsAi(plan),
      configured: aiEnabled,
      monthlyLimit: limit, // null = unlimited
      used,
      remaining: limit == null ? null : Math.max(0, limit - used),
    });
  });

  /**
   * POST /ai/chat — body: { messages: { role, content }[] }.
   * Runs one assistant turn scoped to the authenticated user's company + permissions.
   * Blocked with a 403 when the company's plan does not include the AI assistant.
   */
  chat = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const plan = await this.planFor(req.user.companyId);
    if (!planAllowsAi(plan)) {
      throw new AppError(
        `The AI assistant isn't included on the ${planDef(plan).name} plan. ` +
          `Upgrade to Pro or higher to enable it.`,
        403,
      );
    }

    // Enforce the plan's monthly message cap to protect against runaway AI costs.
    const limit = planAiLimit(plan);
    const period = this.currentPeriod();
    if (limit != null) {
      const used = await this.usageFor(req.user.companyId);
      if (used >= limit) {
        throw new AppError(
          `You've reached the ${limit.toLocaleString()} AI messages included on the ` +
            `${planDef(plan).name} plan this month. It resets next month, or upgrade for more.`,
          429,
        );
      }
    }

    const messages = req.body?.messages as ChatMessage[] | undefined;
    if (!Array.isArray(messages)) {
      throw new AppError('messages must be an array of { role, content }', 400);
    }

    const result = await this.service.chat(messages, {
      companyId: req.user.companyId,
      userId: req.user.userId,
      role: req.user.role,
      permissions: req.user.permissions,
    });

    // Count this message against the monthly cap (after a successful turn).
    await prisma.aiUsage.upsert({
      where: { companyId_period: { companyId: req.user.companyId, period } },
      create: { companyId: req.user.companyId, period, count: 1 },
      update: { count: { increment: 1 } },
    });

    res.json(result);
  });
}
