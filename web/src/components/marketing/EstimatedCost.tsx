import { formatCurrency } from "@/lib/utils";
import { FLAT_PLAN_SUMMARY } from "@/lib/plans";

/**
 * "What teams typically spend" table. Pricing is a flat monthly price per plan —
 * not per seat — so the cost is the same whether you add one user or fill the plan.
 */
export function EstimatedCost() {
  return (
    <section className="py-16">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            One flat price per plan
          </h2>
          <p className="mt-3 text-ink-600">
            No per-seat math. Pick the plan that fits your crew — the monthly price is
            the same no matter how many users you add (up to the plan&apos;s limit).
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl overflow-hidden rounded-2xl border border-ink-100">
          <table className="w-full">
            <thead>
              <tr className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3 text-right">Flat monthly price</th>
              </tr>
            </thead>
            <tbody>
              {FLAT_PLAN_SUMMARY.map((plan) => (
                <tr key={plan.name} className="border-t border-ink-100">
                  <td className="px-6 py-4 text-sm font-medium text-ink-800">
                    {plan.name}
                    <span className="ml-2 text-xs font-normal text-ink-400">{plan.cap}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-lg font-bold text-ink-900">
                    {formatCurrency(plan.price)}
                    <span className="text-sm font-normal text-ink-400"> / mo</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mx-auto mt-5 max-w-xl text-center text-xs text-ink-400">
          Plans exclude a one-time implementation / onboarding fee ({formatCurrency(500)}–
          {formatCurrency(5000)}+ depending on plan and deployment size). Enterprise is
          custom-priced — see the plans above.
        </p>
      </div>
    </section>
  );
}
