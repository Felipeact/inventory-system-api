const QUOTES = [
  {
    quote:
      "We cut emergency supply-house runs by a third in the first month. Every truck is stocked to its template and I can see it from my desk.",
    name: "Marcus Reyes",
    role: "Operations Manager, Cascade HVAC",
  },
  {
    quote:
      "The techs actually use it because scanning a part takes two seconds. Receipt reconciliation that used to eat my Fridays is now done by lunch.",
    name: "Dana Whitfield",
    role: "Office Manager, BluePeak Plumbing",
  },
  {
    quote:
      "Onboarding 40 electricians onto the mobile app took an afternoon. Inventory accuracy went from 'who knows' to 98%.",
    name: "Priya Nair",
    role: "VP Field Service, Ironside Electric",
  },
];

export function Testimonials() {
  return (
    <section className="py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Loved by the field</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Built with contractors, for contractors
          </h2>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {QUOTES.map((q) => (
            <figure key={q.name} className="card flex flex-col p-7">
              <div className="mb-4 flex gap-1 text-brand-500" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <blockquote className="flex-1 text-[15px] leading-relaxed text-ink-700">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-ink-100 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {q.name.split(" ").map((p) => p[0]).join("")}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{q.name}</span>
                  <span className="block text-xs text-ink-500">{q.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
