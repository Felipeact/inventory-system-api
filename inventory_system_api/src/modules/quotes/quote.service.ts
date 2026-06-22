/**
 * @file quote.service.ts
 * @description Super-admin sales pipeline for PROSPECTS (companies not yet in the
 * system). A quote moves through: DRAFT → SENT (awaiting payment) → PAID →
 * CODE_ISSUED → REGISTERED, plus DECLINED. Picking a plan auto-prices the quote
 * from the catalog. On payment (Stripe webhook) the activation code is issued
 * automatically, and — when there's no setup fee — emailed with a registration link.
 */

import crypto from 'crypto';
import Stripe from 'stripe';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { AppError } from '../../core/app-error';
import { env } from '../../config/env';
import { EmailService } from '../email/email.service';
import { PLAN_CATALOG, planDef } from '../../config/plans';

export type QuoteInterval = 'monthly' | 'biweekly';

export class QuoteService {
  private stripe: Stripe | null = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
  private email = new EmailService();

  private client(): Stripe {
    if (!this.stripe) {
      throw new AppError('Billing is not configured. Set STRIPE_SECRET_KEY on the API to enable it.', 503);
    }
    return this.stripe;
  }

  private frontendUrl(): string {
    const url = env.FRONTEND_URL?.replace(/\/$/, '');
    if (!url) {
      throw new AppError('FRONTEND_URL must be set so Stripe can redirect back after checkout.', 500);
    }
    return url;
  }

  private recurringFor(interval: QuoteInterval): { interval: 'month' | 'week'; interval_count: number } {
    return interval === 'biweekly'
      ? { interval: 'week', interval_count: 2 }
      : { interval: 'month', interval_count: 1 };
  }

  /** Generate a readable, unambiguous activation code like ABCD-EFGH-JKLM. */
  private generateCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
    const group = () =>
      Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    return `${group()}-${group()}-${group()}`;
  }

  /** List the whole pipeline, newest first. */
  list() {
    return prisma.quote.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new AppError('Quote not found', 404);
    return quote;
  }

  /** Create a draft quote for a prospect. Auto-prices from the plan catalog. */
  async create(dto: any) {
    const companyName = String(dto?.companyName ?? '').trim();
    const contactEmail = String(dto?.contactEmail ?? '').trim();
    if (!companyName) throw new AppError('companyName is required', 400);
    if (!contactEmail) throw new AppError('contactEmail is required', 400);

    const planKey = String(dto?.plan ?? 'PRO').toUpperCase();
    const def = PLAN_CATALOG[planKey];
    if (!def) throw new AppError(`Unknown plan "${dto?.plan}"`, 400);

    const interval: QuoteInterval = dto?.interval === 'biweekly' ? 'biweekly' : 'monthly';
    const seats = Math.max(1, Math.floor(Number(dto?.seats ?? 1)) || 1);

    // Amount: explicit override wins; otherwise the plan's flat monthly price.
    // Custom-priced plans (e.g. Enterprise) require an explicit amount.
    let amount = dto?.amount != null && dto.amount !== '' ? Number(dto.amount) : NaN;
    if (!Number.isFinite(amount)) {
      if (def.priceMonthly == null) {
        throw new AppError(`The ${def.name} plan is custom-priced — provide an amount.`, 400);
      }
      amount = def.priceMonthly;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('amount must be a positive number (USD).', 400);
    }

    const setupFee = Number(dto?.setupFee ?? 0);
    if (!Number.isFinite(setupFee) || setupFee < 0) {
      throw new AppError('setupFee must be 0 or a positive number (USD).', 400);
    }

    // Entitlement caps: default to the plan's catalog caps; allow a per-deal override.
    const resolveLimit = (raw: unknown, fallback: number): number => {
      if (raw == null || raw === '') return fallback;
      const n = Math.floor(Number(raw));
      if (!Number.isFinite(n) || n < 1) {
        throw new AppError('Seat/product limits must be a whole number of 1 or more.', 400);
      }
      return n;
    };
    const maxUsers = resolveLimit(dto?.maxUsers, def.maxUsers);
    const maxProducts = resolveLimit(dto?.maxProducts, def.maxProducts);

    return prisma.quote.create({
      data: {
        companyName,
        contactEmail,
        plan: def.key,
        seats,
        maxUsers,
        maxProducts,
        amount,
        interval,
        description: dto?.description ? String(dto.description).trim() : null,
        setupFee,
        setupLabel: setupFee > 0 ? String(dto?.setupLabel ?? 'Setup & onboarding').trim() : null,
        status: 'DRAFT',
      },
    });
  }

  /**
   * Generate the Stripe checkout link for a quote and email it to the prospect.
   * Card is kept on file; the recurring amount is auto-charged each cycle.
   */
  async send(id: string) {
    const quote = await this.get(id);
    if (quote.status === 'REGISTERED' || quote.status === 'PAID' || quote.status === 'CODE_ISSUED') {
      throw new AppError(`This quote is already ${quote.status.toLowerCase()}.`, 400);
    }

    const stripe = this.client();
    const base = this.frontendUrl();
    const interval = quote.interval === 'biweekly' ? 'biweekly' : 'monthly';

    // Reuse the quote's customer if it already has one, else create it.
    const customerId =
      quote.stripeCustomerId ||
      (
        await stripe.customers.create({
          name: quote.companyName,
          email: quote.contactEmail,
          metadata: { quoteId: quote.id, kind: 'prospect_quote' },
        })
      ).id;

    const product = await stripe.products.create({
      name: quote.description || `${planDef(quote.plan).name} plan`,
      metadata: { quoteId: quote.id, kind: 'prospect_quote' },
    });

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(quote.amount * 100),
          recurring: this.recurringFor(interval),
          product: product.id,
        },
      },
    ];

    if (quote.setupFee > 0) {
      const setupProduct = await stripe.products.create({
        name: quote.setupLabel || 'Setup fee',
        metadata: { quoteId: quote.id, kind: 'prospect_quote_setup' },
      });
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(quote.setupFee * 100),
          product: setupProduct.id,
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: quote.id,
      line_items: lineItems,
      metadata: { quoteId: quote.id, kind: 'prospect_quote' },
      subscription_data: { metadata: { quoteId: quote.id, kind: 'prospect_quote' } },
      success_url: `${base}/?quote=paid`,
      cancel_url: `${base}/?quote=cancelled`,
    });

    if (!session.url) throw new AppError('Stripe did not return a checkout URL.', 502);

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: 'SENT',
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
        checkoutUrl: session.url,
      },
    });

    // Best-effort: email the link to the prospect (no-op if email isn't configured).
    void this.email.sendQuoteCheckoutLink({
      email: quote.contactEmail,
      companyName: quote.companyName,
      checkoutUrl: session.url,
      amount: quote.amount,
      interval,
      setupFee: quote.setupFee,
      description: quote.description,
    });

    return updated;
  }

  /**
   * Webhook entry point: a prospect just paid. Issues the activation code and (when
   * there's no setup fee) emails it. Idempotent — safe to call repeatedly.
   */
  async markPaidFromCheckout(session: Stripe.Checkout.Session) {
    const quoteId = session.metadata?.quoteId || session.client_reference_id;
    if (!quoteId) {
      logger.warn({ session: session.id }, 'prospect_quote checkout has no quoteId');
      return;
    }
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) {
      logger.warn({ quoteId }, 'prospect_quote checkout references unknown quote');
      return;
    }
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
    await this.issueCodeForQuote(quote, subscriptionId);
  }

  /** Webhook: a checkout link expired before payment — mark the quote EXPIRED. */
  async markExpiredFromCheckout(session: Stripe.Checkout.Session) {
    const quoteId = session.metadata?.quoteId || session.client_reference_id;
    if (!quoteId) return;
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (quote && quote.status === 'SENT') {
      await prisma.quote.update({ where: { id: quote.id }, data: { status: 'EXPIRED' } });
      logger.info({ quoteId }, 'Prospect quote checkout expired');
    }
  }

  /**
   * Issue the activation code for a paid quote. Idempotent: if the quote already has a
   * code, does nothing. Carries the quote's caps (default to the plan's catalog caps).
   */
  private async issueCodeForQuote(quote: { id: string; status: string; activationCode: string | null; plan: string; companyName: string; contactEmail: string; setupFee: number; maxUsers: number | null; maxProducts: number | null }, subscriptionId: string | null) {
    if (['PAID', 'CODE_ISSUED', 'REGISTERED'].includes(quote.status) && quote.activationCode) {
      return; // already processed
    }

    const def = planDef(quote.plan);
    const code = this.generateCode();
    const activation = await prisma.activationCode.create({
      data: {
        code,
        plan: def.key,
        maxUsers: quote.maxUsers ?? def.maxUsers,
        maxProducts: quote.maxProducts ?? def.maxProducts,
        isActive: true,
        isUsed: false,
      },
    });

    const shouldAutoEmail = quote.setupFee <= 0;
    if (shouldAutoEmail) {
      void this.email.sendActivationCode({
        email: quote.contactEmail,
        companyName: quote.companyName,
        code,
        plan: def.name,
      });
    }

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: 'CODE_ISSUED',
        paidAt: new Date(),
        stripeSubscriptionId: subscriptionId ?? undefined,
        activationCode: code,
        activationCodeId: activation.id,
        codeEmailedAt: shouldAutoEmail ? new Date() : null,
      },
    });

    logger.info({ quoteId: quote.id, autoEmailed: shouldAutoEmail }, 'Prospect quote paid — activation code issued');
  }

  /**
   * Operator-triggered: re-check a SENT quote against Stripe and advance it. Recovers
   * from a missed webhook — if the checkout was paid, issue the code; if it expired,
   * mark it expired.
   */
  async syncFromStripe(id: string) {
    const quote = await this.get(id);
    if (!quote.stripeCheckoutSessionId) return quote;
    if (['CODE_ISSUED', 'REGISTERED'].includes(quote.status)) return quote;

    const session = await this.client().checkout.sessions.retrieve(quote.stripeCheckoutSessionId);
    if (session.status === 'complete' || session.payment_status === 'paid') {
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
      await this.issueCodeForQuote(quote, subscriptionId);
    } else if (session.status === 'expired' && quote.status === 'SENT') {
      await prisma.quote.update({ where: { id: quote.id }, data: { status: 'EXPIRED' } });
    }
    return this.get(id);
  }

  /**
   * Operator-triggered: force-issue the code now (e.g. payment confirmed out of band).
   */
  async forceIssueCode(id: string) {
    const quote = await this.get(id);
    await this.issueCodeForQuote(quote, quote.stripeSubscriptionId ?? null);
    return this.get(id);
  }

  /** Reconcile all open (SENT) quotes against Stripe. Returns how many advanced. */
  async reconcileOpen(): Promise<number> {
    const open = await prisma.quote.findMany({ where: { status: 'SENT' } });
    let resolved = 0;
    for (const quote of open) {
      try {
        const before = quote.status;
        const after = await this.syncFromStripe(quote.id);
        if (after.status !== before) resolved++;
      } catch (err) {
        logger.warn({ err, quoteId: quote.id }, 'Reconcile: failed to sync quote');
      }
    }
    return resolved;
  }

  /** (Re)send the activation code + registration link to the prospect. */
  async emailCode(id: string) {
    const quote = await this.get(id);
    if (!quote.activationCode) {
      throw new AppError('No activation code has been issued for this quote yet.', 400);
    }
    await this.email.sendActivationCode({
      email: quote.contactEmail,
      companyName: quote.companyName,
      code: quote.activationCode,
      plan: planDef(quote.plan).name,
    });
    return prisma.quote.update({ where: { id }, data: { codeEmailedAt: new Date() } });
  }

  /** Decline/cancel a quote. Cancels the Stripe subscription if one exists. */
  async decline(id: string) {
    const quote = await this.get(id);
    if (quote.stripeSubscriptionId) {
      try {
        await this.client().subscriptions.cancel(quote.stripeSubscriptionId);
      } catch (err) {
        logger.warn({ err, quoteId: id }, 'Failed to cancel Stripe subscription on decline');
      }
    }
    return prisma.quote.update({ where: { id }, data: { status: 'DECLINED' } });
  }

  /** Delete a draft quote (only drafts can be removed). */
  async remove(id: string) {
    const quote = await this.get(id);
    if (quote.status !== 'DRAFT') {
      throw new AppError('Only draft quotes can be deleted. Decline active ones instead.', 400);
    }
    await prisma.quote.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Link a registered company back to its quote (called from registration when an
   * issued code is consumed). Flips the quote to REGISTERED.
   */
  async markRegistered(code: string, companyId: string) {
    const quote = await prisma.quote.findFirst({ where: { activationCode: code } });
    if (!quote) return;
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'REGISTERED', companyId },
    });
  }
}
