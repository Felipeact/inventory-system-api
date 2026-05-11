/**
 * @file base.controller.ts
 * @description Abstract base controller class providing common HTTP response methods.
 * All application controllers should extend this class for consistent response formatting.
 */

import { Request, Response } from "express";

/**
 * BaseController - Abstract base class for all controllers
 * Provides standardized response handler methods
 * 
 * @abstract
 * @example
 * export class UserController extends BaseController {
 *   // Implementations use this.ok(), this.created(), etc.
 * }
 */
export abstract class BaseController {
  /**
   * Send successful response with 200 status
   * @param {Response} res - Express response object
   * @param {any} data - Data to send in response body
   */
  protected ok(res: Response, data: any) {
    res.status(200).json(data);
  }

  /**
   * Send created response with 201 status (typically for POST requests)
   * @param {Response} res - Express response object
   * @param {any} data - Created resource data to send in response body
   */
  protected created(res: Response, data: any) {
    res.status(201).json(data);
  }

  /**
   * Send error response with 400 status
   * @param {Response} res - Express response object
   * @param {any} error - Error object or message to send in response body
   */
  protected fail(res: Response, error: any) {
    res.status(400).json({ error });
  }
}