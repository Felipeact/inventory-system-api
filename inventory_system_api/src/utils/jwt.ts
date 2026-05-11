import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const generateAccessToken = (payload: {
  userId: string;
  companyId: string;
}) => {
  return jwt.sign(
    payload,
    env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
};

export const generateRefreshToken = (payload: {
  userId: string;
  companyId: string;
}) => {
  return jwt.sign(
    payload,
    env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
};

export const generateSuperAdminToken = (payload: {
  superAdminId: string;
  email: string;
}) => {
  return jwt.sign(
    payload,
    env.JWT_SECRET!,
    { expiresIn: '12h' }
  );
};