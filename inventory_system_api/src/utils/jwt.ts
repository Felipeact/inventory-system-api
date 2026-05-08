import jwt from 'jsonwebtoken';

export const generateAccessToken = (payload: {
  userId: string;
  companyId: string;
}) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
};

export const generateRefreshToken = (payload: {
  userId: string;
  companyId: string;
}) => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
};