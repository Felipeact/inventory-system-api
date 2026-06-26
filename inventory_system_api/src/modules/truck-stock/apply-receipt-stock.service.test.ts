/**
 * Unit tests for booking an approved receipt's purchased quantities onto the
 * truck's stock (TruckStockService.updateReceiptStatus -> applyReceiptToStock).
 * The repository and audit service are mocked so these run without a database.
 */

jest.mock('./truck-stock.repository', () => ({
  TruckStockRepository: jest.fn().mockImplementation(() => ({
    findReceiptById: jest.fn(),
    findReceiptWithItems: jest.fn(),
    updateReceiptStatus: jest.fn().mockResolvedValue({}),
    increaseTruckStockItemQuantity: jest.fn().mockResolvedValue({}),
    createMovement: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('../../audit/audit.service', () => ({
  AuditService: jest.fn().mockImplementation(() => ({
    log: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { TruckStockService } from './truck-stock.service';

type Repo = {
  findReceiptById: jest.Mock;
  findReceiptWithItems: jest.Mock;
  updateReceiptStatus: jest.Mock;
  increaseTruckStockItemQuantity: jest.Mock;
  createMovement: jest.Mock;
};

function buildService(): { svc: TruckStockService; repo: Repo } {
  const svc = new TruckStockService();
  const repo = (svc as unknown as { repo: Repo }).repo;
  return { svc, repo };
}

// Receipt buys 5 capacitors; the truck's template carries that item at qty 0.
const stockItem = { id: 'si1', productName: 'Dual Run Capacitor', currentQuantity: 0 };
const receiptWithItems = {
  companyId: 'c1',
  items: [{ id: 'l1', itemName: 'Dual Run Capacitor 45/5 MFD', quantity: 5 }],
  truck: { stockAssignments: [{ template: { items: [stockItem] } }] },
};

describe('updateReceiptStatus — stock booking on approval', () => {
  it('books purchased quantities onto truck stock when approving a pending receipt', async () => {
    const { svc, repo } = buildService();
    repo.findReceiptById.mockResolvedValue({ companyId: 'c1', status: 'PENDING' });
    repo.findReceiptWithItems.mockResolvedValue(receiptWithItems);

    await svc.updateReceiptStatus('r1', { status: 'APPROVED' }, 'c1', 'u1');

    expect(repo.increaseTruckStockItemQuantity).toHaveBeenCalledWith('si1', 5);
    expect(repo.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        truckStockItemId: 'si1',
        action: 'RECEIPT_PURCHASE',
        previousQuantity: 0,
        newQuantity: 5,
      }),
    );
  });

  it('does not touch stock when re-approving an already-approved receipt', async () => {
    const { svc, repo } = buildService();
    repo.findReceiptById.mockResolvedValue({ companyId: 'c1', status: 'APPROVED' });

    await svc.updateReceiptStatus('r1', { status: 'APPROVED' }, 'c1', 'u1');

    expect(repo.increaseTruckStockItemQuantity).not.toHaveBeenCalled();
    expect(repo.findReceiptWithItems).not.toHaveBeenCalled();
  });

  it('does not touch stock when rejecting a receipt', async () => {
    const { svc, repo } = buildService();
    repo.findReceiptById.mockResolvedValue({ companyId: 'c1', status: 'PENDING' });

    await svc.updateReceiptStatus('r1', { status: 'REJECTED' }, 'c1', 'u1');

    expect(repo.increaseTruckStockItemQuantity).not.toHaveBeenCalled();
  });

  it('skips receipt lines that match no truck stock item', async () => {
    const { svc, repo } = buildService();
    repo.findReceiptById.mockResolvedValue({ companyId: 'c1', status: 'NEEDS_REVIEW' });
    repo.findReceiptWithItems.mockResolvedValue({
      companyId: 'c1',
      items: [{ id: 'l1', itemName: 'Mystery Widget', quantity: 3 }],
      truck: { stockAssignments: [{ template: { items: [stockItem] } }] },
    });

    await svc.updateReceiptStatus('r1', { status: 'APPROVED' }, 'c1', 'u1');

    expect(repo.increaseTruckStockItemQuantity).not.toHaveBeenCalled();
  });
});
