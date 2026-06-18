import pino from 'pino';

/**
 * Structured application logger.
 *
 * `redact` strips sensitive values (auth headers, cookies, secrets, passwords, tokens)
 * from any log line so credentials never end up in log storage even at debug/trace level.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-bootstrap-secret"]',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.currentPassword',
      '*.newPassword',
      '*.token',
      '*.accessToken',
      '*.refreshToken'
    ],
    censor: '[REDACTED]'
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } }
  })
});
