import {
  registerSchema,
  loginSchema,
  requestResetSchema,
  resetPasswordSchema
} from './auth.validation';

describe('auth validation schemas', () => {
  describe('registerSchema', () => {
    it('accepts a valid registration payload', () => {
      const result = registerSchema.safeParse({
        body: {
          email: 'user@example.com',
          password: 'secret123',
          code: 'ACTIVATION',
          companyName: 'Acme'
        }
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid email', () => {
      const result = registerSchema.safeParse({
        body: { email: 'not-an-email', password: 'secret123', code: 'X', companyName: 'Acme' }
      });
      expect(result.success).toBe(false);
    });

    it('rejects a password shorter than 6 characters', () => {
      const result = registerSchema.safeParse({
        body: { email: 'user@example.com', password: '123', code: 'X', companyName: 'Acme' }
      });
      expect(result.success).toBe(false);
    });

    it('rejects a missing activation code', () => {
      const result = registerSchema.safeParse({
        body: { email: 'user@example.com', password: 'secret123', code: '', companyName: 'Acme' }
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts a valid login payload', () => {
      const result = loginSchema.safeParse({
        body: { email: 'user@example.com', password: 'anything' }
      });
      expect(result.success).toBe(true);
    });

    it('rejects an empty password', () => {
      const result = loginSchema.safeParse({
        body: { email: 'user@example.com', password: '' }
      });
      expect(result.success).toBe(false);
    });
  });

  describe('requestResetSchema', () => {
    it('requires a valid email', () => {
      expect(requestResetSchema.safeParse({ body: { email: 'a@b.com' } }).success).toBe(true);
      expect(requestResetSchema.safeParse({ body: { email: 'nope' } }).success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('requires a token and a 6+ char password', () => {
      expect(
        resetPasswordSchema.safeParse({ body: { token: 't', newPassword: 'secret123' } }).success
      ).toBe(true);
      expect(
        resetPasswordSchema.safeParse({ body: { token: '', newPassword: 'secret123' } }).success
      ).toBe(false);
      expect(
        resetPasswordSchema.safeParse({ body: { token: 't', newPassword: '123' } }).success
      ).toBe(false);
    });
  });
});
