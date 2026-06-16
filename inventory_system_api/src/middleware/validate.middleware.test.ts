import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { validate } from './validate.middleware';

const schema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email')
  })
});

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

describe('validate middleware', () => {
  it('calls next() when the request is valid', () => {
    const req = { body: { name: 'Jane', email: 'jane@example.com' }, params: {}, query: {} } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 400 with the first error message when invalid', () => {
    const req = { body: { name: '', email: 'bad' }, params: {}, query: {} } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ success: false, message: 'Name is required' });
  });
});
