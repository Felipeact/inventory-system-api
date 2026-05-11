/**
 * @file audit.service.ts
 * @description Audit logging service for tracking user actions.
 * Records all significant operations (create, update, delete) with user and company context.
 * Used throughout the application to maintain an audit trail for compliance and debugging.
 */

import { prisma } from '../lib/prisma';

/**
 * AuditService - Handles audit log recording
 * 
 * @class AuditService
 * @example
 * const audit = new AuditService();
 * await audit.log('CREATE_ASSET', userId, companyId, 'Created new asset with ID: xyz');
 */
export class AuditService {
  /**
   * Log an action to the audit trail
   * 
   * @param {string} action - Type of action performed (e.g., 'CREATE_ASSET', 'UPDATE_USER')
   * @param {string} userId - ID of user who performed the action
   * @param {string} companyId - ID of company context for the action
   * @param {string} [details] - Optional additional details about the action
   * @returns {Promise<void>}
   * 
   * @example
   * await audit.log(
   *   'UPDATE_ASSET',
   *   'user-123',
   *   'company-456',
   *   'Updated asset status from active to inactive'
   * );
   */
  async log(
    action: string,
    userId: string,
    companyId: string,
    details?: string
  ) {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        companyId,
        details
      }
    });
  }
}