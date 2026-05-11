/**
 * @file error.middleware.ts
 * @description Global error handling middleware.
 * Catches all errors from route handlers and returns appropriate HTTP responses.
 * Must be registered as the last middleware in the Express app.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../core/app-error';

/**
 * Error handling middleware that catches and responds to all application errors
 * 
 * @param {Error} err - The error object thrown by route handlers
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * 
 * @description
 * - If error is AppError instance: Returns custom status code and message
 * - For all other errors: Returns 500 Internal Server Error
 * - Logs all errors to console for debugging
 */
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error(err);

  // Handle custom application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Handle unexpected errors
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};