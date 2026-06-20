/**
 * @file ai.routes.ts
 * @description Routes for the AI assistant. All endpoints require authentication and an
 * active subscription — the assistant acts with the caller's own permissions.
 */

import { Router } from 'express';
import { AiController } from './ai.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { subscriptionMiddleware } from '../../middleware/subscription.middleware';

const router = Router();
const controller = new AiController();

router.get('/status', authMiddleware, controller.status);

router.post('/chat', authMiddleware, subscriptionMiddleware, controller.chat);

export default router;
