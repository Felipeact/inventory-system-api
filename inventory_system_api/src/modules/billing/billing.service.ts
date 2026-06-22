/**
 * @file billing.service.ts
 * @description Stripe Billing integration for self-serve, per-seat subscriptions.
 *
 * Flow:
 *  - createCheckoutSession → hosted Stripe Checkout (subscription mode, quantity = seats).
 *  - createPortalSession   → hosted Stripe Customer Portal (update card, cancel, invoices).
 *  - webhooks              → Stripe is the source of truth; events sync the company's
 *                            plan, limits, and subscriptionStatus into our database.
 *
 * Stripe pays out to the connected bank account — money never touches a PayPal balance.
 */

import Stripe from 'stripe';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { AppError } from '../../core/app-error';
import { env, billingEnabled } from '../../config/env';
import {
  SELF_SERVE_PLANS,
  planForPriceId,
} from './billing.config';
import { QuoteService } from '../quotes/quote.service';

export class BillingService {
  private stripe: Stripe | null = env.STRIPE_SECRET_KEY
    ? new Stripe(env.STRIPE_SECRET_KEY)
    : null;

  private quotes = new QuoteService();

  private client(): Stripe {
    if (!this.stripe) {
      throw new AppError(
        'Billing is not configured. Set STRIPE_SECRET_KEY on the API to enable it.',
        503,
      );
    }
    return this.stripe;
  }

  private frontendUrl(): string {
    const url = env.FRONTEND_URL?.replace(/\/$/, '');
    if (!url) {
      throw new AppError(
        'FRONTEND_URL must be set so Stripe can redirect back after checkout.',
        500,
      );
    }
    return url;
  }

  /** Current billing state for the company, for the in-app billing page. */
  async getStatus(companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new AppError('Company not found', 404);

    const seats = await prisma.user.count({ where: { companyId } });

    return {
      enabled: billingEnabled,
      plan: company.plan,
      subscriptionStatus: company.subscriptionStatus,
      hasSubscription: Boolean(company.stripeSubscriptionId),
      manageable: Boolean(company.stripeCustomerId),
      currentPeriodEnd: company.currentPeriodEnd,
      seats,
      maxUsers: company.maxUsers,
      maxProducts: company.maxProducts,
      monthlyPriceOverride: company.monthlyPriceOverride,
    };
  }

  /** Reuse or lazily create the company's Stripe customer, persisting the id. */
  private async ensureCustomer(companyId: string): Promise<string> {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new AppError('Company not found', 404);
    if (company.stripeCustomerId) return company.stripeCustomerId;

    const customer = await this.client().customers.create({
      name: company.name,
      metadata: { companyId },
    });

    await prisma.company.update({
      where: { id: companyId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Start a Checkout session to subscribe the company to `plan`. Quantity is the
   * company's current seat (user) count; Stripe handles proration on later changes.
   */
  async createCheckoutSession(companyId: string, plan: string): Promise<{ url: string }> {
    const key = String(plan ?? '').toUpperCase();
    const config = SELF_SERVE_PLANS[key];

    if (!config) {
      throw new AppError(`Plan "${plan}" is not available for self-serve checkout.`, 400);
    }
    if (!config.priceId) {
      throw new AppError(
        `No Stripe price is configured for the ${key} plan (set STRIPE_PRICE_${key}).`,
        500,
      );
    }

    const customer = await this.ensureCustomer(companyId);
    const seats = Math.max(1, await prisma.user.count({ where: { companyId } }));
    const base = this.frontendUrl();

    const session = await this.client().checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: companyId,
      line_items: [{ price: config.priceId, quantity: seats }],
      allow_promotion_codes: true,
      subscription_data: { metadata: { companyId } },
      success_url: `${base}/billing?status=success`,
      cancel_url: `${base}/billing?status=cancelled`,
    });

    if (!session.url) {
      throw new AppError('Stripe did not return a checkout URL.', 502);
    }
    return { url: session.url };
  }

  /** Open the Stripe Customer Portal so the company can manage its subscription. */
  async createPortalSession(companyId: string): Promise<{ url: string }> {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new AppError('Company not found', 404);
    if (!company.stripeCustomerId) {
      throw new AppError('No billing account yet — subscribe to a plan first.', 400);
    }

    const session = await this.client().billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${this.frontendUrl()}/billing`,
    });

    return { url: session.url };
  }

  /** Verify a webhook signature and return the parsed event. */
  verifyWebhook(req: Request): Stripe.Event {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError('STRIPE_WEBHOOK_SECRET is not configured.', 503);
    }
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      throw new AppError('Missing Stripe signature.', 400);
    }
    try {
      // req.body is a raw Buffer here (see the raw body parser on the webhook route).
      return this.client().webhooks.constructEvent(
        req.body as Buffer,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'invalid signature';
      throw new AppError(`Webhook signature verification failed: ${message}`, 400);
    }
  }

  /** Route a verified Stripe event to the right handler. */
  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // A prospect (not yet a company) paying their sales quote — issue the code.
        if (session.metadata?.kind === 'prospect_quote') {
          await this.quotes.markPaidFromCheckout(session);
          break;
        }
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          const subscription = await this.client().subscriptions.retrieve(subscriptionId);
          await this.applySubscription(subscription);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        // Prospect-quote subscriptions aren't tied to a company yet — the quote
        // pipeline owns them (via checkout.session.completed). Don't touch companies.
        if (sub.metadata?.kind === 'prospect_quote') break;
        await this.applySubscription(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.kind === 'prospect_quote') break;
        const companyId = await this.companyIdFor(sub);
        // Only suspend the company when its *plan* subscription ends — not when a
        // one-off custom quote/charge subscription is cancelled.
        if (companyId) {
          const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { stripeSubscriptionId: true },
          });
          if (company?.stripeSubscriptionId === sub.id) {
            await this.lapseSubscription(sub);
          }
        }
        break;
      }
      default:
        // Other events (invoice.paid, payment_failed, …) are handled by Stripe's own
        // dunning; we only react to subscription state transitions.
        break;
    }
  }

  /** Resolve the company a subscription belongs to (metadata first, then customer id). */
  private async companyIdFor(subscription: Stripe.Subscription): Promise<string | null> {
    const fromMeta = subscription.metadata?.companyId;
    if (fromMeta) return fromMeta;

    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;
    if (!customerId) return null;

    const company = await prisma.company.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    return company?.id ?? null;
  }

  /** Apply an active/trialing subscription's plan + limits to the company. */
  private async applySubscription(subscription: Stripe.Subscription): Promise<void> {
    const companyId = await this.companyIdFor(subscription);
    if (!companyId) {
      logger.warn({ subscription: subscription.id }, 'Stripe subscription has no resolvable company');
      return;
    }

    // A canceled/unpaid subscription means the company loses access.
    if (!['active', 'trialing'].includes(subscription.status)) {
      await this.lapseSubscription(subscription);
      return;
    }

    const item = subscription.items.data[0];
    const priceId = item?.price?.id;
    const plan = planForPriceId(priceId);
    if (!plan) {
      logger.warn({ subscription: subscription.id, priceId }, 'Subscription price not mapped to a plan');
      return;
    }

    const config = SELF_SERVE_PLANS[plan];
    const periodEnd = this.periodEnd(subscription, item);

    await prisma.company.update({
      where: { id: companyId },
      data: {
        plan,
        subscriptionStatus: 'ACTIVE',
        maxUsers: config.maxUsers,
        maxProducts: config.maxProducts,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: periodEnd,
      },
    });

    logger.info({ companyId, plan }, 'Applied Stripe subscription to company');
  }

  /**
   * Suspend the company when its paid subscription ends. There is no free tier, so
   * the company is marked INACTIVE (the subscription middleware then blocks premium
   * features) until it re-subscribes. Its plan and data are preserved.
   */
  private async lapseSubscription(subscription: Stripe.Subscription): Promise<void> {
    const companyId = await this.companyIdFor(subscription);
    if (!companyId) return;

    await prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: 'INACTIVE',
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      },
    });

    logger.info({ companyId }, 'Company subscription lapsed — access suspended');
  }

  /** Read the current period end from the subscription (or its first item), as a Date. */
  private periodEnd(
    subscription: Stripe.Subscription,
    item: Stripe.SubscriptionItem | undefined,
  ): Date | null {
    // `current_period_end` historically lived on the subscription; in newer API
    // versions it moved onto the items. Read defensively from both.
    const seconds =
      (subscription as unknown as { current_period_end?: number }).current_period_end ??
      (item as unknown as { current_period_end?: number } | undefined)?.current_period_end;
    return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
  }

  // ---- Operator quotes: custom recurring charges (super-admin) ----------------

  /** Map our interval names to Stripe recurring config. */
  private recurringFor(interval: 'monthly' | 'biweekly'): { interval: 'month' | 'week'; interval_count: number } {
    return interval === 'biweekly'
      ? { interval: 'week', interval_count: 2 }
      : { interval: 'month', interval_count: 1 };
  }

  private intervalLabel(interval?: string | null, count?: number | null): 'monthly' | 'biweekly' | 'custom' {
    if (interval === 'month' && (count ?? 1) === 1) return 'monthly';
    if (interval === 'week' && count === 2) return 'biweekly';
    return 'custom';
  }

  /**
   * Create a custom recurring charge ("quote") for a company. Returns a Stripe Checkout
   * link the operator sends to the client; the client enters a card once, the card is
   * kept on file, and Stripe then auto-charges the recurring amount every cycle (monthly
   * or biweekly). An optional one-time setup fee is billed on the first invoice.
   */
  async createQuote(
    companyId: string,
    input: {
      amount: number;
      interval: 'monthly' | 'biweekly';
      label?: string;
      setupFee?: number;
      setupLabel?: string;
    },
  ) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('amount must be a positive number (USD).', 400);
    }
    if (input.interval !== 'monthly' && input.interval !== 'biweekly') {
      throw new AppError('interval must be "monthly" or "biweekly".', 400);
    }
    const setupFee = Number(input.setupFee ?? 0);
    if (!Number.isFinite(setupFee) || setupFee < 0) {
      throw new AppError('setupFee must be 0 or a positive number (USD).', 400);
    }

    const customer = await this.ensureCustomer(companyId);
    const label = (input.label || 'Custom plan').trim();
    const base = this.frontendUrl();
    const stripe = this.client();

    // Recurring line item (price_data needs an existing Product id).
    const product = await stripe.products.create({
      name: label,
      metadata: { companyId, kind: 'custom_quote' },
    });

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(amount * 100),
          recurring: this.recurringFor(input.interval),
          product: product.id,
        },
      },
    ];

    // Optional one-time setup fee — added to the subscription's first invoice.
    if (setupFee > 0) {
      const setupProduct = await stripe.products.create({
        name: (input.setupLabel || 'Setup fee').trim(),
        metadata: { companyId, kind: 'custom_quote_setup' },
      });
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(setupFee * 100),
          product: setupProduct.id,
        },
      });
    }

    // Checkout in subscription mode collects + stores the card and bills automatically.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: companyId,
      line_items: lineItems,
      subscription_data: { metadata: { companyId, kind: 'custom_quote' } },
      success_url: `${base}/?billing=success`,
      cancel_url: `${base}/?billing=cancelled`,
    });

    if (!session.url) {
      throw new AppError('Stripe did not return a checkout URL.', 502);
    }

    return {
      url: session.url,
      amount,
      interval: input.interval,
      label,
      setupFee,
    };
  }

  /** List a company's custom recurring charges (quotes), excluding its plan subscription. */
  async listQuotes(companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new AppError('Company not found', 404);
    if (!company.stripeCustomerId) return [];

    const subs = await this.client().subscriptions.list({
      customer: company.stripeCustomerId,
      status: 'all',
      limit: 100,
      expand: ['data.items.data.price.product'],
    });

    return subs.data
      .filter((sub) => sub.id !== company.stripeSubscriptionId) // exclude the plan sub
      .map((sub) => {
        const item = sub.items.data[0];
        const price = item?.price;
        const quantity = item?.quantity ?? 1;
        const amount = ((price?.unit_amount ?? 0) * quantity) / 100;
        return {
          id: sub.id,
          status: sub.status,
          amount,
          interval: this.intervalLabel(price?.recurring?.interval, price?.recurring?.interval_count),
          label: price?.nickname || (typeof price?.product === 'object' ? (price.product as any)?.name : null) || 'Custom plan',
          currentPeriodEnd: this.periodEnd(sub, item),
          createdAt: new Date(sub.created * 1000),
        };
      });
  }

  /** Cancel a custom quote subscription immediately. */
  async cancelQuote(subscriptionId: string) {
    await this.client().subscriptions.cancel(subscriptionId);
    return { id: subscriptionId, status: 'canceled' };
  }
}
