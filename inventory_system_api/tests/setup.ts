/**
 * @file tests/setup.ts
 * @description Jest setup file. Populates the environment variables required by
 * src/config/env.ts so importing application modules does not call process.exit(1)
 * during tests.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-jwt-refresh-secret';
process.env.PORT ||= '3000';
process.env.SMTP_HOST ||= 'smtp.test.local';
process.env.SMTP_PORT ||= '587';
process.env.SMTP_USER ||= 'test@test.local';
process.env.SMTP_PASS ||= 'test-pass';
process.env.SMTP_FROM ||= 'test@test.local';
process.env.FRONTEND_URL ||= 'http://localhost:3001';
process.env.CORS_ORIGINS ||= 'http://localhost:3000,http://localhost:5173';
process.env.LOG_LEVEL = 'silent';
