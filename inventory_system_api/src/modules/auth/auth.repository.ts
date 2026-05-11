/**
 * @file auth.repository.ts
 * @description Data access layer for authentication operations.
 * Handles all database queries related to users, activation codes, refresh tokens, and password resets.
 * Uses Prisma for type-safe database operations.
 */

import { prisma } from '../../lib/prisma';

/**
 * AuthRepository - Data access for authentication
 * 
 * @class AuthRepository
 */
export class AuthRepository {
  /**
   * Find activation code by code string
   * 
   * @param {string} code - Activation code to find
   * @returns {Promise<ActivationCode|null>} Activation code or null if not found
   */
  findCode(code: string) {
    return prisma.activationCode.findUnique({
      where: { code },
    });
  }

  /**
   * Mark activation code as used and associate with company
   * 
   * @param {string} code - Activation code to mark as used
   * @param {string} companyId - Company ID to associate with code
   * @returns {Promise<ActivationCode>} Updated activation code
   */
  useCode(code: string, companyId: string) {
    return prisma.activationCode.update({
      where: { code },
      data: {
        isUsed: true,
        companyId,
      },
    });
  }

  /**
   * Create new user
   * 
   * @param {Object} data - User creation data
   * @param {string} data.email - User email address
   * @param {string} data.passwordHash - Bcrypt hashed password
   * @param {string} data.companyId - Company this user belongs to
   * @param {string} data.roleId - User's initial role
   * @returns {Promise<User>} Created user
   */
  createUser(data: {
    email: string;
    passwordHash: string;
    companyId: string;
    roleId: string;
  }) {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Create refresh token for user
   * 
   * @param {Object} data - Refresh token creation data
   * @param {string} data.token - JWT token string
   * @param {string} data.userId - User ID
   * @param {string} data.companyId - Company ID
   * @param {Date} data.expiresAt - Token expiration date
   * @returns {Promise<RefreshToken>} Created refresh token
   */
  createRefreshToken(data: {
    token: string;
    userId: string;
    companyId: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({
      data
    });
  }

  /**
   * Find refresh token by token string
   * 
   * @param {string} token - Token to find
   * @returns {Promise<RefreshToken|null>} Refresh token or null if not found
   */
  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token }
    });
  }

  /**
   * Delete refresh token(s) by token string
   * 
   * @param {string} token - Token string to delete
   * @returns {Promise<{count: number}>} Number of deleted tokens
   */
  deleteRefreshToken(token: string) {
    return prisma.refreshToken.deleteMany({
      where: { token }
    });
  }

  /**
   * Delete all refresh tokens for a user (logout all sessions)
   * 
   * @param {string} userId - User ID whose tokens should be deleted
   * @returns {Promise<{count: number}>} Number of deleted tokens
   */
  deleteUserRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({
      where: { userId }
    });
  }

  /**
   * Find user by email with role information
   * 
   * @param {string} email - User email to find
   * @returns {Promise<User|null>} User with role or null if not found
   */
  findUser(email: string) {
    return prisma.user.findFirst({
      where: { email },
      include: {
        role: true,
      },
    });
  }

  /**
   * Create password reset token
   * 
   * @param {Object} data - Password reset token data
   * @param {string} data.token - Reset token string
   * @param {string} data.userId - User ID requesting reset
   * @param {Date} data.expiresAt - Token expiration date
   * @returns {Promise<PasswordResetToken>} Created reset token
   */
  createPasswordResetToken(data: {
    token: string;
    userId: string;
    expiresAt: Date;
  }) {
    return prisma.passwordResetToken.create({ data });
  }

  /**
   * Find password reset token with associated user
   * 
   * @param {string} token - Reset token to find
   * @returns {Promise<PasswordResetToken|null>} Token with user data or null
   */
  findPasswordResetToken(token: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });
  }

  /**
   * Mark password reset token as used
   * 
   * @param {string} token - Token to mark as used
   * @returns {Promise<PasswordResetToken>} Updated token
   */
  markPasswordResetTokenUsed(token: string) {
    return prisma.passwordResetToken.update({
      where: { token },
      data: { used: true }
    });
  }

  /**
   * Update user password
   * 
   * @param {string} userId - User ID to update
   * @param {string} passwordHash - New bcrypt hashed password
   * @returns {Promise<User>} Updated user
   */
  updateUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }
}

