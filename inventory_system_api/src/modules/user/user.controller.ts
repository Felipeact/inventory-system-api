import { Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { UserService } from './user.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class UserController extends BaseController {
  private service = new UserService();

  create = async (req: AuthRequest, res: Response) => {
    try {
      const data = await this.service.createUser(
        req.body,
        req.user!.companyId
      );

      return this.created(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  assignPermission = async (req: AuthRequest, res: Response) => {
    try {
      const data = await this.service.assignPermission(
        req.body,
        req.user!.companyId
      );

      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  removePermission = async (req: AuthRequest, res: Response) => {
    try {
      const data = await this.service.removePermission(
        req.body,
        req.user!.companyId
      );

      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  getAll = async (req: AuthRequest, res: Response) => {
    const data = await this.service.getUsers(req.user!.companyId);
    return this.ok(res, data);
  };

  delete = async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id;

      if (typeof id !== 'string') {
        return this.fail(res, 'User id must be a string');
      }

      await this.service.deleteUser(id, req.user!.companyId);

      return this.ok(res, { message: 'Deleted' });
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };
}