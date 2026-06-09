/**
 * @file email.service.ts
 * @description Email sending service.
 * Sends transactional emails (welcome, password reset, etc.) using SMTP.
 */

import nodemailer from 'nodemailer';
import { env } from '../../config/env';

/**
 * EmailService - Transactional email handling
 */
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: env.SMTP_FROM,
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
  ) {
    await this.transporter.sendMail({
      from: env.SMTP_FROM,
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
    await this.transporter.sendMail({
      from: env.SMTP_FROM,
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