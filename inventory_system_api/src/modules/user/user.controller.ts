import { Response } from 'express';

import { BaseController } from '../../core/base.controller';
import { UserService } from './user.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../core/async-handler';
import { AppError } from '../../core/app-error';

export class UserController extends BaseController {

  private service = new UserService();

  create = asyncHandler(async (
    req: AuthRequest,
    res: Response
  ) => {

    const data =
      await this.service.createUser(
        req.body,
        req.user!.companyId,
        req.user!.userId
      );

    return this.created(res, data);
  });

  update = asyncHandler(async (
    req: AuthRequest,
    res: Response
  ) => {

    const id = req.params.id;

    if (typeof id !== 'string') {
      throw new AppError(
        'User id must be a string',
        400
      );
    }

    const data =
      await this.service.updateUser(
        id,
        req.body,
        req.user!.companyId,
        req.user!.userId
      );

    return this.ok(res, data);
  });

  updateCurrentProfile = asyncHandler(async (
    req: AuthRequest,
    res: Response
  ) => {

    const data =
      await this.service.updateCurrentUserProfile(
        req.user!.userId,
        req.user!.companyId,
        req.body
      );

    return this.ok(res, data);
  });

  assignPermission = asyncHandler(async (
    req: AuthRequest,
    res: Response
  ) => {

    const data =
      await this.service.assignPermission(
        req.body,
        req.user!.companyId,
        req.user!.userId
      );

    return this.ok(res, data);
  });

  removePermission = asyncHandler(async (
    req: AuthRequest,
    res: Response
  ) => {

    const data =
      await this.service.removePermission(
        req.body,
        req.user!.companyId,
        req.user!.userId
      );

    return this.ok(res, data);
  });

  getAll = asyncHandler(async (
    req: AuthRequest,
    res: Response
  ) => {

    const data =
      await this.service.getUsers(
        req.user!.companyId
      );

    return this.ok(res, data);
  });

  invite = asyncHandler(async (
    req: AuthRequest,
    res: Response
  ) => {

    const data =
      await this.service.inviteUser(
        req.body,
        req.user!.companyId,
        req.user!.userId
      );

    return this.created(res, data);
  });

  resetPassword = asyncHandler(async (
    req: AuthRequest,
    res: Response
  ) => {

    const id: any = req.params.id;

    const data =
      await this.service.resetPassword(
        id,
        req.user!.companyId,
        req.user!.userId
      );

    return this.ok(res, data);
  });

  delete = asyncHandler(async (
    req: AuthRequest,
    res: Response
  ) => {

    const id = req.params.id;

    if (typeof id !== 'string') {
      throw new AppError(
        'User id must be a string',
        400
      );
    }



    await this.service.deleteUser(
      id,
      req.user!.companyId,
      req.user!.userId
    );

    return this.ok(res, {
      message: 'Deleted'
    });
  });
}