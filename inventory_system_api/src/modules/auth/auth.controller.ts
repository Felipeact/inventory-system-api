import { Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AuthController extends BaseController {
  private service = new AuthService();

  register = async (req: AuthRequest, res: Response) => {
    try {
      const data = await this.service.register(req.body);
      return this.created(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  login = async (req: AuthRequest, res: Response) => {
    try {
      const data = await this.service.login(req.body);
      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  validate = async (req: AuthRequest, res: Response) => {
    return this.ok(res, {
      valid: true,
      user: req.user,
    });
  };
}