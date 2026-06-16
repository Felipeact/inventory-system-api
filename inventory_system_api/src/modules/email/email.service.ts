/**
 * @file email.service.ts
 * @description Email sending service.
 * Sends transactional emails (welcome, password reset, etc.) using SMTP.
 *
 * Email is optional: when SMTP is not configured (see `emailEnabled` in env.ts),
 * every method logs a warning and returns without sending, so the surrounding
 * flows (registration, password reset, user invites) keep working. Configure the
 * SMTP_* variables to enable delivery.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { env, emailEnabled } from '../../config/env';
import { logger } from '../../lib/logger';

/**
 * EmailService - Transactional email handling
 */
export class EmailService {
  private transporter: Transporter | null = emailEnabled
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT),
        secure: Number(env.SMTP_PORT) === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      })
    : null;

  /**
   * Send an email if SMTP is configured; otherwise log and skip.
   * @returns true if the email was dispatched, false if email is disabled.
   */
  private async send(options: nodemailer.SendMailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn(
        { to: options.to, subject: options.subject },
        'Email not sent: SMTP is not configured (set SMTP_* env vars to enable)'
      );
      return false;
    }

    await this.transporter.sendMail({ from: env.SMTP_FROM, ...options });
    return true;
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.send({
      to: email,
      subject: 'Reset your password',
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 30 minutes.</p>
      `
    });
  }

  async sendUserInviteEmail(
    email: string,
    name: string,
    temporaryPassword: string
  ): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'You have been invited to Inventory System',
      html: `
        <h2>Welcome to Inventory System</h2>

        <p>Hello ${name || email},</p>

        <p>Your account has been created.</p>

        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary password:</strong> ${temporaryPassword}</p>

        <p>Please log in and change your password after your first login.</p>
      `
    });
  }

  async sendWelcomeEmail(email: string, companyName: string) {
    await this.send({
      to: email,
      subject: 'Welcome to Inventory System',
      html: `
        <h2>Welcome!</h2>
        <p>Your company <strong>${companyName}</strong> was registered successfully.</p>
        <p>You can now log in and start managing your inventory.</p>
      `
    });
  }
}
