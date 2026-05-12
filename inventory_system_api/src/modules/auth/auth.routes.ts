import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, registerSchema } from './auth.validation';


const router = Router();
const controller = new AuthController();

router.post('/register', authRateLimiter, validate(registerSchema), controller.register);
router.post('/login', authRateLimiter, validate(loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/validate', authMiddleware, controller.validate);
router.post('/request-reset', authRateLimiter, controller.requestPasswordReset);
router.post('/reset-password', authRateLimiter, controller.resetPassword);

export default router;