import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import { COMPARISON, PLANS } from "@/lib/plans";

function Cell({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check size={18} className="mx-auto text-brand-600" aria-label="Included" />;
  if (value === false)
    return <Minus size={18} className="mx-auto text-ink-300" aria-label="Not included" />;
  return <span className="text-sm font-medium text-ink-700">{value}</span>;
}

export function ComparisonTable() {
  return (
    <section className="py-8">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Compare every plan
          </h2>
          <p className="mt-3 text-ink-600">
            All the details, side by side. Switch plans anytime as your crew grows.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white py-4 text-left text-sm font-semibold text-ink-900" />
                {PLANS.map((p) => (
                  <th
                    key={p.id}
                    className="px-4 py-4 text-center text-sm font-bold text-ink-900"
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((section) => (
                <Fragment key={section.category}>
                  <tr>
                    <td
                      colSpan={4}
                      className="bg-ink-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500"
                    >
                      {section.category}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.feature} className="border-b border-ink-100">
                      <td className="sticky left-0 bg-white py-3.5 pr-4 text-sm text-ink-700">
                        {row.feature}
                      </td>
                      {row.values.map((v, i) => (
                        <td key={i} className="px-4 py-3.5 text-center">
                          <Cell value={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
