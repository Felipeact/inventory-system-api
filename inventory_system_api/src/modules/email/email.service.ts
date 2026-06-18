/**
 * @file email.service.ts
 * @description Email sending service.
 * Sends transactional emails (welcome, password reset, invites) and operational
 * notifications (new company registrations, super-admin creation, demo/lead requests)
 * using SMTP.
 *
 * Email is optional: when SMTP is not configured (see `emailEnabled` in env.ts),
 * every method logs a warning and returns without sending, so the surrounding
 * flows (registration, password reset, user invites) keep working. Configure the
 * SMTP_* variables to enable delivery.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { env, emailEnabled, resendEnabled } from '../../config/env';
import { logger } from '../../lib/logger';

/** Minimal HTML escaping so user-supplied values can't inject markup into emails. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wrap body content in a simple, consistent branded shell. */
function layout(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e2330;">
    <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:20px 24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;color:#fff;font-size:18px;">StockPilot · Inventory System</h1>
    </div>
    <div style="border:1px solid #e6e8ee;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
      <h2 style="margin:0 0 12px;font-size:18px;">${esc(title)}</h2>
      ${bodyHtml}
    </div>
    <p style="color:#9aa0ad;font-size:12px;text-align:center;margin:16px 0;">
      Automated message from the Inventory System API.
    </p>
  </div>`;
}

/**
 * EmailService - Transactional email and operational notifications.
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
        },
        // Fail fast instead of hanging for minutes when the SMTP port is blocked
        // (common on PaaS like Railway) or the server is unreachable.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000
      })
    : null;

  /**
   * Send an email via the configured provider. Resend (HTTPS API) is preferred when
   * configured because it works on hosts that block outbound SMTP; otherwise SMTP is
   * used. If neither is configured, the call logs and skips.
   *
   * Delivery failures are always caught and logged so a flaky mail server never breaks
   * the surrounding request (registration, lead capture, password reset, …).
   * @returns true if the email was dispatched, false if email is disabled or failed.
   */
  private async send(options: nodemailer.SendMailOptions): Promise<boolean> {
    if (resendEnabled) {
      return this.sendViaResend(options);
    }

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from: env.SMTP_FROM, ...options });
        return true;
      } catch (err) {
        logger.error(
          { err, to: options.to, subject: options.subject },
          'Email delivery failed (SMTP)'
        );
        return false;
      }
    }

    logger.warn(
      { to: options.to, subject: options.subject },
      'Email not sent: no provider configured (set RESEND_API_KEY or the SMTP_* vars)'
    );
    return false;
  }

  /** Send via Resend's HTTPS API (https://resend.com/docs). */
  private async sendViaResend(options: nodemailer.SendMailOptions): Promise<boolean> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.RESEND_FROM,
          to: options.to,
          subject: options.subject,
          html: options.html
        }),
        // Don't let a slow provider hang the request.
        signal: AbortSignal.timeout(10_000)
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        logger.error(
          { status: res.status, body, to: options.to, subject: options.subject },
          'Email delivery failed (Resend)'
        );
        return false;
      }
      return true;
    } catch (err) {
      logger.error(
        { err, to: options.to, subject: options.subject },
        'Email delivery failed (Resend)'
      );
      return false;
    }
  }

  /**
   * Send an operational notification to the platform owner
   * (ADMIN_NOTIFICATION_EMAIL). Used for sign-ups, super-admin creation, and leads.
   */
  async sendAdminNotification(subject: string, bodyHtml: string): Promise<boolean> {
    const to = env.ADMIN_NOTIFICATION_EMAIL;
    if (!to) {
      logger.warn({ subject }, 'Admin notification skipped: ADMIN_NOTIFICATION_EMAIL is unset');
      return false;
    }
    return this.send({ to, subject, html: layout(subject, bodyHtml) });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.send({
      to: email,
      subject: 'Reset your password',
      html: layout('Password reset request', `
        <p>You requested a password reset. Click the button below to choose a new password.</p>
        <p style="margin:20px 0;">
          <a href="${esc(resetUrl)}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Reset password</a>
        </p>
        <p style="color:#6b7280;font-size:13px;">Or paste this link: <br>${esc(resetUrl)}</p>
        <p style="color:#6b7280;font-size:13px;">This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>
      `)
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
      html: layout('Welcome to Inventory System', `
        <p>Hello ${esc(name || email)},</p>
        <p>An account has been created for you.</p>
        <p><strong>Email:</strong> ${esc(email)}<br>
        <strong>Temporary password:</strong> ${esc(temporaryPassword)}</p>
        <p>Please log in and change your password after your first sign-in.</p>
      `)
    });
  }

  async sendWelcomeEmail(email: string, companyName: string) {
    await this.send({
      to: email,
      subject: 'Welcome to Inventory System',
      html: layout('Your workspace is ready', `
        <p>Your company <strong>${esc(companyName)}</strong> was registered successfully.</p>
        <p>You can now sign in and start managing your inventory, assets, and truck stock.</p>
      `)
    });
  }

  /** Notify the platform owner that a new company/account self-registered. */
  async notifyNewRegistration(details: {
    companyName: string;
    email: string;
    plan: string;
  }): Promise<boolean> {
    return this.sendAdminNotification('New company registered', `
      <p>A new account just signed up on the Inventory System.</p>
      <table style="font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Company</td><td><strong>${esc(details.companyName)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Admin email</td><td>${esc(details.email)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Plan</td><td>${esc(details.plan)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">When</td><td>${esc(new Date().toISOString())}</td></tr>
      </table>
    `);
  }

  /** Notify the platform owner that the first super-admin was created. */
  async notifyNewSuperAdmin(email: string): Promise<boolean> {
    return this.sendAdminNotification('Super-admin account created', `
      <p>A super-admin account was just created for the platform.</p>
      <p><strong>Email:</strong> ${esc(email)}<br>
      <strong>When:</strong> ${esc(new Date().toISOString())}</p>
      <p style="color:#6b7280;font-size:13px;">If this wasn't you, rotate the SUPER_ADMIN_BOOTSTRAP_SECRET immediately.</p>
    `);
  }

  /** Forward a "request a demo" / contact submission to the platform owner. */
  async notifyNewLead(lead: Record<string, unknown>): Promise<boolean> {
    const rows = Object.entries(lead)
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top;">${esc(k)}</td><td>${esc(v)}</td></tr>`
      )
      .join('');

    return this.sendAdminNotification('New demo / contact request', `
      <p>A new demo request came in from the website.</p>
      <table style="font-size:14px;border-collapse:collapse;">${rows}</table>
      <p style="color:#6b7280;font-size:13px;">Received ${esc(new Date().toISOString())}</p>
    `);
  }
}
