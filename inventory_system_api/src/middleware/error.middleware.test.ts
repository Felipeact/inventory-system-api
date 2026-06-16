import type { Request, Response, NextFunction } from 'express';
import { errorMiddleware } from './error.middleware';
import { AppError } from '../core/app-error';

function mockRes() {
  const res = {} as Response & { statusCode?: number; body?: unknown };
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res;
}

const req = { method: 'GET', originalUrl: '/test' } as Request;
const next = jest.fn() as NextFunction;

describe('error middleware', () => {
  it('uses the status code and message from an AppError', () => {
    const res = mockRes();
    errorMiddleware(new AppError('Not found', 404), req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ success: false, message: 'Not found' });
  });

  it('defaults AppError to status 400', () => {
    const res = mockRes();
    errorMiddleware(new AppError('Bad input'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns a generic 500 for unexpected errors without leaking details', () => {
    const res = mockRes();
    errorMiddleware(new Error('boom: secret stack detail'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ success: false, message: 'Internal server error' });
  });
});
