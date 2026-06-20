/**
 * @file ai.controller.ts
 * @description HTTP handlers for the AI assistant.
 */

import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../core/async-handler';
import { AppError } from '../../core/app-error';
import { aiEnabled } from '../../config/env';
import { AiService, type ChatMessage } from './ai.service';

export class AiController {
  private service = new AiService();

  /** Returns whether the assistant is available (key configured). */
  status = asyncHandler(async (_req: AuthRequest, res: Response) => {
    res.json({ enabled: aiEnabled });
  });

  /**
   * POST /ai/chat — body: { messages: { role, content }[] }.
   * Runs one assistant turn scoped to the authenticated user's company + permissions.
   */
  chat = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
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
