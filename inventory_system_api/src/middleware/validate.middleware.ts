/**
 * @file validate.middleware.ts
 * @description Request validation middleware using Zod schemas.
 * Validates incoming request data (body, params, query) against Zod schemas.
 * Returns 400 Bad Request if validation fails with first error message.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Higher-order middleware factory for request validation
 * Creates middleware that validates request data using Zod schemas
 * 
 * @param {ZodType} schema - Zod schema to validate against
 * @returns {Function} Express middleware that validates requests
 * 
 * @description
 * Validates request body, params, and query against provided Zod schema
 * Returns 400 error with first validation error message if validation fails
 * 
 * @example
 * // Define validation schema
 * const createSchema = z.object({
 *   body: z.object({
 *     name: z.string().min(1),
 *     email: z.string().email()
 *   })
 * });
 * 
 * // Use in route
 * router.post('/users',
 *   validate(createSchema),
 *   controller.create
 * );
 */
export const validate =
  (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Validate request data against schema
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    // Handle validation errors
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.issues[0].message
      });
    }

    // Validation passed, proceed to next middleware
    next();
  };