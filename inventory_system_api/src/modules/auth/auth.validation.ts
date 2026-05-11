/**
 * @file auth.validation.ts
 * @description Request validation schemas for authentication endpoints.
 * Uses Zod for type-safe schema validation.
 */

import { z } from 'zod';

/**
 * Schema for POST /auth/register request validation
 * Validates required fields for company and user registration
 * 
 * @type {ZodType}
 * @property {string} body.email - Valid email address
 * @property {string} body.password - Minimum 6 characters
 * @property {string} body.code - Valid activation code
 * @property {string} body.companyName - Non-empty company name
 */
export const registerSchema = z.object({
  body: z.object({
    /** User email address for company admin */
    email: z.string().email('Invalid email address'),
    /** Password for the admin account */
    password: z.string().min(6, 'Password must be at least 6 characters'),
    /** Activation code for creating new company */
    code: z.string().min(1, 'Activation code is required'),
    /** Company name to register */
    companyName: z.string().min(1, 'Company name is required')
  })
});

/**
 * Schema for POST /auth/login request validation
 * Validates email and password for user authentication
 * 
 * @type {ZodType}
 * @property {string} body.email - Valid email address
 * @property {string} body.password - Non-empty password
 */
export const loginSchema = z.object({
  body: z.object({
    /** User email address */
    email: z.string().email('Invalid email address'),
    /** User password */
    password: z.string().min(1, 'Password is required')
  })
});