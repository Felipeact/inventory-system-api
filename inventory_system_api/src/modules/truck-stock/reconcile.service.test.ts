/**
 * Unit tests for TruckStockService.reconcileReceipt — allowance-based
 * reconciliation. The repository and audit service are mocked so these run
 * without a database.
 */

jest.mock('./truck-stock.repository', () => ({
  TruckStockRepository: jest.fn().mockImplementation(() => ({
    findReceiptWithItems: jest.fn(),
    updateReceiptStatus: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('../../audit/audit.service', () => ({
  AuditService: jest.fn().mockImplementation(() => ({
    log: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { TruckStockService } from './truck-stock.service';

type Item = { id: string; productName: string; requiredQuantity: number; expectedPrice: number | null };
type Template = { allowance: number | null; items: Item[] };

function makeReceipt(totalAmount: number | null, templates: Template[]) {
  return {
    companyId: 'c1',
    totalAmount,
    items: [],
    truck: { stockAssignments: templates.map((template) => ({ template })) },
  };
}

// HVAC template priced per item: 10x180 + 10x25 + 10x5 = 2100.
const HVAC_ITEMS: Item[] = [
  { id: 'i1', productName: 'R-410A Refrigerant', requiredQuantity: 10, expectedPrice: 180 },
  { id: 'i2', productName: 'Dual Run Capacitor', requiredQuantity: 10, expectedPrice: 25 },
  { id: 'i3', productName: '16x25x1 Pleated Air Filter', requiredQuantity: 10, expectedPrice: 5 },
];

function buildService(receipt: unknown) {
  const svc = new TruckStockService();
  const repo = (svc as unknown as { repo: { findReceiptWithItems: jest.Mock; updateReceiptStatus: jest.Mock } }).repo;
  repo.findReceiptWithItems.mockResolvedValue(receipt);
  return { svc, repo };
}

describe('TruckStockService.reconcileReceipt — allowance (budget cap)', () => {
  it('RECONCILED when the total equals the template allowance', async () => {
    const { svc, repo } = buildService(makeReceipt(2100, [{ allowance: 2100, items: [] }]));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('RECONCILED');
    expect(result.expectedTotal).toBe(2100);
    expect(result.difference).toBe(0);
    expect(result.overBudget).toBe(false);
    expect(repo.updateReceiptStatus).toHaveBeenCalledWith('r1', 'RECONCILED');
  });

  it('RECONCILED when the total is under the allowance (within budget)', async () => {
    const { svc } = buildService(makeReceipt(1800, [{ allowance: 2100, items: [] }]));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('RECONCILED');
    expect(result.difference).toBe(-300);
    expect(result.overBudget).toBe(false);
  });

  it('NEEDS_REVIEW + overBudget when the total exceeds the allowance', async () => {
    const { svc } = buildService(makeReceipt(2200, [{ allowance: 2100, items: [] }]));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.difference).toBe(100);
    expect(result.overBudget).toBe(true);
  });

  it('sums allowances across multiple assigned templates', async () => {
    const { svc } = buildService(
      makeReceipt(2500, [
        { allowance: 2100, items: [] },
        { allowance: 500, items: [] },
      ]),
    );

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.expectedTotal).toBe(2600);
    expect(result.status).toBe('RECONCILED');
  });

  it('falls back to priced items when a template has no explicit allowance', async () => {
    const { svc } = buildService(makeReceipt(2100, [{ allowance: null, items: HVAC_ITEMS }]));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.expectedTotal).toBe(2100);
    expect(result.status).toBe('RECONCILED');
    expect(result.hasExpected).toBe(true);
  });

  it('NEEDS_REVIEW (unverifiable) with no allowance and no priced items', async () => {
    const unpriced = HVAC_ITEMS.map((i) => ({ ...i, expectedPrice: null }));
    const { svc } = buildService(makeReceipt(2100, [{ allowance: null, items: unpriced }]));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.hasExpected).toBe(false);
    expect(result.expectedTotal).toBe(0);
  });

  it('NEEDS_REVIEW when the receipt has no declared total', async () => {
    const { svc } = buildService(makeReceipt(null, [{ allowance: 2100, items: [] }]));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.receiptTotal).toBeNull();
    expect(result.difference).toBeNull();
  });

  it('404s when the receipt belongs to another company', async () => {
    const { svc } = buildService(makeReceipt(2100, [{ allowance: 2100, items: [] }]));

    await expect(svc.reconcileReceipt('r1', 'other-co', 'u1')).rejects.toThrow();
  });
});
