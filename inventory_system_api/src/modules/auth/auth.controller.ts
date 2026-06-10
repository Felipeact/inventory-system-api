import { Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../core/async-handler';

export class AuthController extends BaseController {
  private service = new AuthService();

  register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.register(req.body);
    return this.created(res, data);
  });

  login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.login(req.body);
    return this.ok(res, data);
  });

  refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.refresh(req.body);
    return this.ok(res, data);
  });

  logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.logout(req.body);
    return this.ok(res, data);
  });

  validate = asyncHandler(async (req: AuthRequest, res: Response) => {
    return this.ok(res, {
      valid: true,
      user: req.user
    });
  });

  requestPasswordReset = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.requestPasswordReset(req.body);
    return this.ok(res, data);
  });

  resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.resetPassword(req.body);
    return this.ok(res, data);
  });


  changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.changePassword(
      req.user!.userId,
      req.user!.companyId,
      req.body
    );

    return this.ok(res, data);
  });
}
