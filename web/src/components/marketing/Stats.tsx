const STATS = [
  { value: "98%", label: "Inventory accuracy after rollout" },
  { value: "6 hrs", label: "Saved per tech each week on parts runs" },
  { value: "30%", label: "Less emergency supply-house spend" },
  { value: "< 1 day", label: "Average time to go live" },
];

export function Stats() {
  return (
    <section className="bg-ink-900 py-16 text-white">
      <div className="container-page grid grid-cols-2 gap-8 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="bg-gradient-to-b from-white to-brand-200 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              {s.value}
            </p>
            <p className="mx-auto mt-2 max-w-[14rem] text-sm text-ink-300">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
