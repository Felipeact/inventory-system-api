/**
 * @file async-handler.ts
 * @description Higher-order function that wraps async route handlers to catch errors.
 * Eliminates the need for try-catch blocks in every async route handler.
 * Passes caught errors to Express error middleware (next).
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to automatically catch and forward errors
 * 
 * @param {Function} fn - Async function that accepts (req, res, next) parameters
 * @returns {Function} Express middleware that safely executes the async function
 * 
 * @example
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await prisma.user.findMany();
 *   res.json(data);
 * }));
 */
export const asyncHandler = (
  fn: (req: any, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Automatically catch and forward any errors from the async function
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};