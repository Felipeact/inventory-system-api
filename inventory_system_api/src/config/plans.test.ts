import {
  planDef,
  planAllowsAi,
  planAiLimit,
  PLAN_CATALOG,
  UNLIMITED,
} from './plans';

describe('plan catalog', () => {
  it('exposes flat monthly prices (not per-seat)', () => {
    expect(PLAN_CATALOG.STARTER.priceMonthly).toBe(199);
    expect(PLAN_CATALOG.PRO.priceMonthly).toBe(499);
    expect(PLAN_CATALOG.BUSINESS.priceMonthly).toBe(999);
    expect(PLAN_CATALOG.ENTERPRISE.priceMonthly).toBeNull();
  });

  it('enforces seat/product caps per tier', () => {
    expect(PLAN_CATALOG.STARTER.maxUsers).toBe(5);
    expect(PLAN_CATALOG.STARTER.maxProducts).toBe(250);
    expect(PLAN_CATALOG.PRO.maxUsers).toBe(25);
    expect(PLAN_CATALOG.BUSINESS.maxUsers).toBe(UNLIMITED);
  });

  describe('planDef', () => {
    it('is case-insensitive', () => {
      expect(planDef('pro').key).toBe('PRO');
      expect(planDef('Business').key).toBe('BUSINESS');
    });

    it('defaults unknown/empty plans to Starter', () => {
      expect(planDef(undefined).key).toBe('STARTER');
      expect(planDef('').key).toBe('STARTER');
      expect(planDef('NOPE').key).toBe('STARTER');
    });
  });

  describe('AI entitlement', () => {
    it('gates AI by plan (Starter excluded, Pro+ included)', () => {
      expect(planAllowsAi('STARTER')).toBe(false);
      expect(planAllowsAi('PRO')).toBe(true);
      expect(planAllowsAi('BUSINESS')).toBe(true);
      expect(planAllowsAi('ENTERPRISE')).toBe(true);
    });

    it('caps monthly AI messages per plan (null = unlimited)', () => {
      expect(planAiLimit('STARTER')).toBe(0);
      expect(planAiLimit('PRO')).toBe(1000);
      expect(planAiLimit('BUSINESS')).toBe(5000);
      expect(planAiLimit('ENTERPRISE')).toBeNull();
    });

    it('a plan with no AI also has a zero AI cap', () => {
      for (const def of Object.values(PLAN_CATALOG)) {
        if (!def.aiEnabled) expect(def.aiMonthlyLimit).toBe(0);
      }
    });
  });
});
