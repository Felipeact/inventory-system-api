import { formatCurrency } from "@/lib/utils";
import { STANDARD_SEAT_PRICE, ESTIMATE_TEAM_SIZES } from "@/lib/plans";

/**
 * "Estimated monthly cost" example table, in line with how field-service software
 * is commonly quoted. Figures are based on the standard (Pro) per-seat rate; actual
 * cost depends on the plan you choose and your seat count.
 */
export function EstimatedCost() {
  return (
    <section className="py-16">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            What teams typically spend
          </h2>
          <p className="mt-3 text-ink-600">
            Field-service platforms usually run <strong>$60–$350+ per user / month</strong>. Here&apos;s a
            quick estimate at our standard {formatCurrency(STANDARD_SEAT_PRICE)}/user rate.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl overflow-hidden rounded-2xl border border-ink-100">
          <table className="w-full">
            <thead>
              <tr className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="px-6 py-3">Team size</th>
                <th className="px-6 py-3 text-right">Estimated monthly cost</th>
              </tr>
            </thead>
            <tbody>
              {ESTIMATE_TEAM_SIZES.map((size) => (
                <tr key={size} className="border-t border-ink-100">
                  <td className="px-6 py-4 text-sm font-medium text-ink-800">
                    {size} users
                  </td>
                  <td className="px-6 py-4 text-right text-lg font-bold text-ink-900">
                    {formatCurrency(size * STANDARD_SEAT_PRICE)}
                    <span className="text-sm font-normal text-ink-400"> / mo</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mx-auto mt-5 max-w-xl text-center text-xs text-ink-400">
          Estimates use the Pro plan rate and exclude a one-time implementation /
          onboarding fee ({formatCurrency(500)}–{formatCurrency(5000)}+ depending on plan and
          deployment size). Starter and Business plans are priced differently — see the plans above.
        </p>
      </div>
    </section>
  );
}
