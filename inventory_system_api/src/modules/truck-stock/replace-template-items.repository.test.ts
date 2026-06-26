/**
 * Unit tests for TruckStockRepository.replaceTemplateItems — the in-place diff
 * that preserves existing items (and their movement history) on template edit
 * instead of delete-and-recreate. Prisma is mocked; no database required.
 */

jest.mock('../../lib/prisma', () => {
  const tx = {
    truckStockItem: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    truckStockMovement: {
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  };
  return {
    prisma: {
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});

import { TruckStockRepository } from './truck-stock.repository';
import { prisma } from '../../lib/prisma';

const tx = (prisma as unknown as { __tx: any }).__tx;

describe('TruckStockRepository.replaceTemplateItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Existing template items: one to keep (matched), one to drop.
    tx.truckStockItem.findMany
      .mockResolvedValueOnce([
        { id: 'keep', productName: 'R-410A Refrigerant', currentQuantity: 5 },
        { id: 'drop', productName: 'Old Filter', currentQuantity: 2 },
      ])
      .mockResolvedValueOnce([]);
  });

  it('updates matched items in place without touching currentQuantity', async () => {
    const repo = new TruckStockRepository();
    await repo.replaceTemplateItems('tmpl', [
      { productName: 'R-410A Refrigerant', requiredQuantity: 10, minimumQuantity: 1 },
      { productName: 'New Capacitor', requiredQuantity: 8, minimumQuantity: 1 },
    ]);

    // Matched item updated by id; data must NOT include currentQuantity.
    expect(tx.truckStockItem.update).toHaveBeenCalledTimes(1);
    const updateArg = tx.truckStockItem.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 'keep' });
    expect(updateArg.data).not.toHaveProperty('currentQuantity');
    expect(updateArg.data.requiredQuantity).toBe(10);
  });

  it('creates only the genuinely new items', async () => {
    const repo = new TruckStockRepository();
    await repo.replaceTemplateItems('tmpl', [
      { productName: 'R-410A Refrigerant', requiredQuantity: 10, minimumQuantity: 1 },
      { productName: 'New Capacitor', requiredQuantity: 8, minimumQuantity: 1 },
    ]);

    expect(tx.truckStockItem.create).toHaveBeenCalledTimes(1);
    expect(tx.truckStockItem.create.mock.calls[0][0].data.productName).toBe('New Capacitor');
  });

  it('removes dropped items after clearing their movements (RESTRICT FK)', async () => {
    const repo = new TruckStockRepository();
    await repo.replaceTemplateItems('tmpl', [
      { productName: 'R-410A Refrigerant', requiredQuantity: 10, minimumQuantity: 1 },
    ]);

    expect(tx.truckStockMovement.deleteMany).toHaveBeenCalledWith({
      where: { truckStockItemId: { in: ['drop'] } },
    });
    expect(tx.truckStockItem.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['drop'] } },
    });
  });

  it('matches names case-insensitively (no spurious delete/recreate)', async () => {
    const repo = new TruckStockRepository();
    await repo.replaceTemplateItems('tmpl', [
      { productName: '  r-410a refrigerant ', requiredQuantity: 12, minimumQuantity: 1 },
      { productName: 'old filter', requiredQuantity: 3, minimumQuantity: 1 },
    ]);

    // Both existing names matched → both updated, nothing created or deleted.
    expect(tx.truckStockItem.update).toHaveBeenCalledTimes(2);
    expect(tx.truckStockItem.create).not.toHaveBeenCalled();
    expect(tx.truckStockItem.deleteMany).not.toHaveBeenCalled();
    expect(tx.truckStockMovement.deleteMany).not.toHaveBeenCalled();
  });
});
