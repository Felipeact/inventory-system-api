/**
 * @file app-error.ts
 * @description Custom error class for application-specific errors.
 * Extends native Error class with HTTP status code for proper error responses.
 * Used throughout the application for consistent error handling.
 */

/**
 * AppError - Custom application error class
 * 
 * @class AppError
 * @extends Error
 * @example
 * throw new AppError('Invalid credentials', 401);
 * throw new AppError('Resource not found', 404);
 */
export class AppError extends Error {
  /** HTTP status code for the error response */
  statusCode: number;

  /**
   * Constructor for AppError
   * @param {string} message - Error message to display
   * @param {number} [statusCode=400] - HTTP status code (default: 400 Bad Request)
   */
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}