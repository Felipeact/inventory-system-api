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
import { planAllowsAi, planDef } from '../../config/plans';
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

  /**
   * Whether the assistant is available to this user: the server must be configured
   * (ANTHROPIC_API_KEY) AND the company's plan must include AI.
   */
  status = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const plan = await this.planFor(req.user.companyId);
    res.json({
      enabled: aiEnabled && planAllowsAi(plan),
      planAllowsAi: planAllowsAi(plan),
      configured: aiEnabled,
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

    res.json(result);
  });
}
