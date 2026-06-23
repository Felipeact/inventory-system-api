import { computeCompanyBilling, PLAN_MONTHLY_PRICE } from './pricing';

describe('computeCompanyBilling (flat per-plan pricing)', () => {
  it('charges the flat plan price regardless of seat count', () => {
    const a = computeCompanyBilling('PRO', null);
    expect(a.monthlyRevenue).toBe(499);
    expect(a.planPrice).toBe(499);
    expect(a.needsPricing).toBe(false);
  });

  it('a custom monthly override takes precedence over the plan price', () => {
    const b = computeCompanyBilling('BUSINESS', 1500);
    expect(b.monthlyRevenue).toBe(1500);
    expect(b.monthlyPriceOverride).toBe(1500);
  });

  it('custom-priced plans with no override contribute $0 and are flagged', () => {
    const e = computeCompanyBilling('ENTERPRISE', null);
    expect(e.monthlyRevenue).toBe(0);
    expect(e.planPrice).toBeNull();
    expect(e.needsPricing).toBe(true);
  });

  it('an override on a custom plan clears the needs-pricing flag', () => {
    const e = computeCompanyBilling('ENTERPRISE', 4000);
    expect(e.monthlyRevenue).toBe(4000);
    expect(e.needsPricing).toBe(false);
  });

  it('unknown plans fall back to Starter pricing', () => {
    expect(computeCompanyBilling('NOPE', null).monthlyRevenue).toBe(199);
  });

  it('PLAN_MONTHLY_PRICE mirrors the catalog', () => {
    expect(PLAN_MONTHLY_PRICE.STARTER).toBe(199);
    expect(PLAN_MONTHLY_PRICE.ENTERPRISE).toBeNull();
  });
});
