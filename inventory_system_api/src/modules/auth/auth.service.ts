/**
 * @file auth.service.ts
 * @description Authentication business logic.
 * Handles user registration, login, token refresh, logout, and password reset operations.
 * Manages company creation, default role setup, and security token generation.
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { AuthRepository } from './auth.repository';
import { RoleService } from '../role/role.service';
import { AppError } from '../../core/app-error';
import { AuditService } from '../../audit/audit.service';
import { EmailService } from '../email/email.service';

/**
 * AuthService - Authentication and authorization business logic
 * 
 * @class AuthService
 * @example
 * const service = new AuthService();
 * const { accessToken, refreshToken } = await service.login({ email, password });
 */
export class AuthService {
  /** Data access layer for auth operations */
  private repo = new AuthRepository();
  /** Service for role management */
  private roleService = new RoleService();
  /** Service for audit logging */
  private audit = new AuditService();
  /** Service for sending emails */
  private emailService = new EmailService();

  /**
   * Register a new company with admin user
   * 
   * @async
   * @param {Object} dto - Registration data
   * @param {string} dto.email - Admin user email
   * @param {string} dto.password - Admin user password
   * @param {string} dto.code - Activation code
   * @param {string} dto.companyName - Company name
   * 
   * @returns {Promise<Object>} Access and refresh tokens
   * 
   * @throws {AppError} 400 - If required fields are missing
   * @throws {AppError} 401 - If activation code is invalid/used/inactive
   * 
   * @description
   * 1. Validates activation code
   * 2. Creates new company with subscription plan from code
   * 3. Sets up default ADMIN and WAREHOUSE roles
   * 4. Creates admin user with hashed password
   * 5. Generates access and refresh tokens
   * 6. Sends welcome email
   */

  async register(dto: any) {
    const { email, password, code, companyName } = dto;

    if (!email || !password || !code || !companyName) {
      throw new AppError(
        'email, password, code, and companyName are required',
        400
      );
    }

    const activation = await this.repo.findCode(code);

    if (!activation || activation.isUsed || !activation.isActive) {
      throw new AppError('Invalid activation code', 401);
    }

    const company = await prisma.company.create({
      data: {
        name: companyName,
        plan: activation.plan,
        subscriptionStatus: 'ACTIVE',
        maxUsers: activation.maxUsers,
        maxProducts: activation.maxProducts
      }
    });

    const { admin } = await this.roleService.createDefaultRoles(company.id);

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.repo.createUser({
      email,
      passwordHash,
      companyId: company.id,
      roleId: admin.id
    });

    await this.repo.useCode(code, company.id);

    const accessToken = generateAccessToken({
      userId: user.id,
      companyId: company.id
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      companyId: company.id
    });

    await this.repo.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      companyId: company.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await this.audit.log(
      'REGISTER_COMPANY',
      user.id,
      company.id,
      `Registered company ${company.name} with ${company.plan} plan`
    );

    await this.emailService.sendWelcomeEmail(email, companyName);

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Login user with email and password
   * 
   * @async
   * @param {Object} dto - Login credentials
   * @param {string} dto.email - User email
   * @param {string} dto.password - User password
   * 
   * @returns {Promise<Object>} Access and refresh tokens
   * 
   * @throws {AppError} 401 - If user not found or password invalid
   * 
   * @description
   * 1. Finds user by email
   * 2. Validates password using bcrypt
   * 3. Generates access and refresh tokens
   * 4. Stores refresh token in database
   * 5. Logs login action
   */

  /**
   * Refresh access token using valid refresh token
   * 
   * @async
   * @param {Object} dto - Token refresh data
   * @param {string} dto.refreshToken - Valid refresh token
   * 
   * @returns {Promise<Object>} New access token
   * 
   * @throws {AppError} 400 - If refresh token not provided
   * @throws {AppError} 401 - If token invalid, not found, or expired
   * 
   * @description
   * 1. Validates refresh token exists in database
   * 2. Checks token hasn't expired
   * 3. Verifies token signature
   * 4. Generates new access token
   * 5. Logs token refresh
   */

  /**
   * Logout user by invalidating refresh token
   * 
   * @async
   * @param {Object} dto - Logout data
   * @param {string} dto.refreshToken - Refresh token to invalidate
   * 
   * @returns {Promise<Object>} Success message
   * 
   * @throws {AppError} 400 - If refresh token not provided
   * @throws {AppError} 401 - If token not found
   * 
   * @description
   * 1. Validates refresh token exists
   * 2. Deletes token from database
   * 3. Logs logout action
   */

  /**
   * Request password reset token to be sent via email
   * 
   * @async
   * @param {Object} dto - Reset request data
   * @param {string} dto.email - User email address
   * 
   * @returns {Promise<Object>} Generic success message (for security)
   * 
   * @throws {AppError} 400 - If email not provided
   * 
   * @description
   * 1. Validates email provided
   * 2. Looks up user by email (doesn't error if not found - security measure)
   * 3. If user found: creates 30-minute expiring reset token
   * 4. Sends reset email with token link
   * 5. Logs password reset request
   * 6. Returns generic message (prevents email enumeration attacks)
   */

  /**
   * Reset user password using reset token
   * 
   * @async
   * @param {Object} dto - Password reset data
   * @param {string} dto.token - Password reset token from email
   * @param {string} dto.newPassword - New password (min 6 chars)
   * 
   * @returns {Promise<Object>} Success message
   * 
   * @throws {AppError} 400 - If token or password not provided or password too short
   * @throws {AppError} 401 - If token invalid, already used, or expired
   * 
   * @description
   * 1. Validates token and password provided
   * 2. Checks password meets minimum requirements
   * 3. Finds reset token with associated user
   * 4. Validates token hasn't been used and isn't expired
   * 5. Hashes new password with bcrypt
   * 6. Updates user password in database
   * 7. Marks reset token as used (one-time use)
   * 8. Logs password reset
   **/
} 