/**
 * Unit tests for the quote pipeline's money + entitlement logic. Prisma and the
 * email service are mocked so these run without a database or network.
 */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    quote: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    activationCode: { create: jest.fn() },
  },
}));

jest.mock('../email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendActivationCode: jest.fn().mockResolvedValue(true),
    sendQuoteCheckoutLink: jest.fn().mockResolvedValue(true),
  })),
}));

import { QuoteService } from './quote.service';
import { prisma } from '../../lib/prisma';
import { UNLIMITED } from '../../config/plans';

const quoteCreate = prisma.quote.create as jest.Mock;
const quoteFind = prisma.quote.findUnique as jest.Mock;
const quoteUpdate = prisma.quote.update as jest.Mock;
const codeCreate = prisma.activationCode.create as jest.Mock;

describe('QuoteService.create — pricing & caps', () => {
  beforeEach(() => {
    quoteCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'q1', ...data }));
  });

  it('auto-prices from the flat plan price and applies the plan caps', async () => {
    const svc = new QuoteService();
    await svc.create({ companyName: 'Acme HVAC', contactEmail: 'owner@acme.com', plan: 'PRO' });

    const data = quoteCreate.mock.calls[0][0].data;
    expect(data.amount).toBe(499); // flat Pro price, NOT × seats
    expect(data.plan).toBe('PRO');
    expect(data.maxUsers).toBe(25);
    expect(data.maxProducts).toBe(UNLIMITED);
  });

  it('lets the operator override amount and caps per deal', async () => {
    const svc = new QuoteService();
    await svc.create({
      companyName: 'Acme',
      contactEmail: 'a@acme.com',
      plan: 'STARTER',
      amount: 250,
      maxUsers: 3,
      maxProducts: 100,
    });

    const data = quoteCreate.mock.calls[0][0].data;
    expect(data.amount).toBe(250);
    expect(data.maxUsers).toBe(3);
    expect(data.maxProducts).toBe(100);
  });

  it('rejects a custom-priced plan with no amount', async () => {
    const svc = new QuoteService();
    await expect(
      svc.create({ companyName: 'Big Co', contactEmail: 'b@big.co', plan: 'ENTERPRISE' }),
    ).rejects.toThrow(/custom-priced/i);
  });

  it('requires a company name and contact email', async () => {
    const svc = new QuoteService();
    await expect(svc.create({ contactEmail: 'a@b.com', plan: 'PRO' })).rejects.toThrow(/companyName/i);
    await expect(svc.create({ companyName: 'A', plan: 'PRO' })).rejects.toThrow(/contactEmail/i);
  });
});

describe('QuoteService.forceIssueCode — idempotent code issuance', () => {
  beforeEach(() => {
    codeCreate.mockResolvedValue({ id: 'code-row-1' });
    quoteUpdate.mockResolvedValue({});
  });

  it('issues exactly one activation code with the quote caps for a paid quote', async () => {
    quoteFind.mockResolvedValue({
      id: 'q1',
      status: 'SENT',
      activationCode: null,
      plan: 'PRO',
      companyName: 'Acme',
      contactEmail: 'a@acme.com',
      setupFee: 0,
      maxUsers: 10,
      maxProducts: 500,
      stripeSubscriptionId: 'sub_1',
    });

    const svc = new QuoteService();
    await svc.forceIssueCode('q1');

    expect(codeCreate).toHaveBeenCalledTimes(1);
    const codeData = codeCreate.mock.calls[0][0].data;
    expect(codeData.plan).toBe('PRO');
    expect(codeData.maxUsers).toBe(10); // the quote's override caps, not plan defaults
    expect(codeData.maxProducts).toBe(500);

    const updateData = quoteUpdate.mock.calls[0][0].data;
    expect(updateData.status).toBe('CODE_ISSUED');
  });

  it('does not re-issue a code for a quote that already has one', async () => {
    quoteFind.mockResolvedValue({
      id: 'q1',
      status: 'CODE_ISSUED',
      activationCode: 'ABCD-EFGH-JKLM',
      plan: 'PRO',
      companyName: 'Acme',
      contactEmail: 'a@acme.com',
      setupFee: 0,
      maxUsers: 25,
      maxProducts: UNLIMITED,
      stripeSubscriptionId: 'sub_1',
    });

    const svc = new QuoteService();
    await svc.forceIssueCode('q1');

    expect(codeCreate).not.toHaveBeenCalled();
  });
});
