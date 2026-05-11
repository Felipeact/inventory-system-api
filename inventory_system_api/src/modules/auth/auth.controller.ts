/**
 * @file auth.controller.ts
 * @description Authentication controller handling registration, login, token refresh, and password reset.
 * Extends BaseController for standardized HTTP response methods.
 * All route handlers wrapped with asyncHandler for automatic error catching.
 */

import { Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../core/async-handler';

/**
 * AuthController - Handles all authentication operations
 * 
 * @class AuthController
 * @extends BaseController
 * @example
 * const controller = new AuthController();
 * router.post('/register', validate(schema), controller.register);
 */
export class AuthController extends BaseController {
  /** Authentication service instance for business logic */
  private service = new AuthService();

  /**
   * Register a new company and user
   * Creates a company, sets up default roles and permissions, and creates admin user
   * 
   * @async
   * @param {AuthRequest} req - Request with email, password, activation code, and company name
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 201 with access and refresh tokens
   */
  register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.register(req.body);
    return this.created(res, data);
  });

  /**
   * User login with email and password
   * Validates credentials and returns JWT tokens
   * 
   * @async
   * @param {AuthRequest} req - Request with email and password
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with access and refresh tokens
   */
  login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.login(req.body);
    return this.ok(res, data);
  });

  /**
   * Refresh access token using refresh token
   * Issues a new short-lived access token without requiring re-login
   * 
   * @async
   * @param {AuthRequest} req - Request with refresh token
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with new access token
   */
  refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.refresh(req.body);
    return this.ok(res, data);
  });

  /**
   * User logout - invalidates refresh token
   * Prevents the refresh token from being used to generate new access tokens
   * 
   * @async
   * @param {AuthRequest} req - Request with refresh token
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with success message
   */
  logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.logout(req.body);
    return this.ok(res, data);
  });

  /**
   * Validate current authentication token
   * Confirms user is authenticated and returns their profile
   * 
   * @async
   * @param {AuthRequest} req - Authenticated request
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with user profile and permissions
   * 
   * @note Requires authMiddleware to be applied first
   */
  validate = asyncHandler(async (req: AuthRequest, res: Response) => {
    return this.ok(res, {
      valid: true,
      user: req.user
    });
  });

  /**
   * Request password reset link
   * Sends email with reset token to user's email address
   * 
   * @async
   * @param {AuthRequest} req - Request with email address
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with generic message (for security)
   */
  requestPasswordReset = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.requestPasswordReset(req.body);
    return this.ok(res, data);
  });

  /**
   * Reset password using reset token
   * Changes user password after validating reset token
   * 
   * @async
   * @param {AuthRequest} req - Request with reset token and new password
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with success message
   */
  resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.resetPassword(req.body);
    return this.ok(res, data);
  });
}