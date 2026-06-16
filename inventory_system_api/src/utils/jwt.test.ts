import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import {
  generateAccessToken,
  generateRefreshToken,
  generateSuperAdminToken
} from './jwt';

describe('jwt utils', () => {
  it('signs an access token that verifies with JWT_SECRET and carries the payload', () => {
    const token = generateAccessToken({ userId: 'u1', companyId: 'c1' });
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    expect(decoded.userId).toBe('u1');
    expect(decoded.companyId).toBe('c1');
    expect(decoded.exp).toBeGreaterThan(decoded.iat as number);
  });

  it('signs a refresh token that verifies with JWT_REFRESH_SECRET', () => {
    const token = generateRefreshToken({ userId: 'u1', companyId: 'c1' });
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;

    expect(decoded.userId).toBe('u1');
    expect(decoded.companyId).toBe('c1');
  });

  it('refresh tokens are not valid access tokens (different secret)', () => {
    const refresh = generateRefreshToken({ userId: 'u1', companyId: 'c1' });
    expect(() => jwt.verify(refresh, env.JWT_SECRET)).toThrow();
  });

  it('signs a super admin token with the expected claims', () => {
    const token = generateSuperAdminToken({ superAdminId: 's1', email: 'admin@test.local' });
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    expect(decoded.superAdminId).toBe('s1');
    expect(decoded.email).toBe('admin@test.local');
  });
});
