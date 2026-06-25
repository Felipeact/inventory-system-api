/**
 * Unit tests for TruckStockService.reconcileReceipt — total-based reconciliation.
 * The repository and audit service are mocked so these run without a database.
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

type TemplateItem = {
  id: string;
  productName: string;
  requiredQuantity: number;
  expectedPrice: number | null;
};

function makeReceipt(totalAmount: number | null, items: TemplateItem[]) {
  return {
    companyId: 'c1',
    totalAmount,
    items: [],
    truck: { stockAssignments: [{ template: { items } }] },
  };
}

// The HVAC mock receipt: 10x180 + 10x25 + 10x5 = 2100.
const HVAC_TEMPLATE: TemplateItem[] = [
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

describe('TruckStockService.reconcileReceipt — match by total', () => {
  it('RECONCILED when the receipt total equals the expected template cost', async () => {
    const { svc, repo } = buildService(makeReceipt(2100, HVAC_TEMPLATE));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('RECONCILED');
    expect(result.expectedTotal).toBe(2100);
    expect(result.receiptTotal).toBe(2100);
    expect(result.difference).toBe(0);
    expect(repo.updateReceiptStatus).toHaveBeenCalledWith('r1', 'RECONCILED');
  });

  it('NEEDS_REVIEW when the total is off, reporting the signed difference', async () => {
    const { svc } = buildService(makeReceipt(2000, HVAC_TEMPLATE));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.difference).toBe(-100);
  });

  it('tolerates sub-cent floating-point noise', async () => {
    const { svc } = buildService(makeReceipt(2100.004, HVAC_TEMPLATE));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('RECONCILED');
  });

  it('NEEDS_REVIEW (unverifiable) when no template item has an expected price', async () => {
    const noPrices = HVAC_TEMPLATE.map((i) => ({ ...i, expectedPrice: null }));
    const { svc } = buildService(makeReceipt(2100, noPrices));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.hasExpected).toBe(false);
    expect(result.expectedTotal).toBe(0);
  });

  it('NEEDS_REVIEW when the receipt has no declared total', async () => {
    const { svc } = buildService(makeReceipt(null, HVAC_TEMPLATE));

    const result = await svc.reconcileReceipt('r1', 'c1', 'u1');

    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.receiptTotal).toBeNull();
    expect(result.difference).toBeNull();
  });

  it('404s when the receipt belongs to another company', async () => {
    const { svc } = buildService(makeReceipt(2100, HVAC_TEMPLATE));

    await expect(svc.reconcileReceipt('r1', 'other-co', 'u1')).rejects.toThrow();
  });
});
