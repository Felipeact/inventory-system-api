const LOGOS = [
  "Cascade HVAC",
  "Ironside Electric",
  "BluePeak Plumbing",
  "Summit Mechanical",
  "Northgate Refrigeration",
  "Vanguard Controls",
];

export function LogoCloud() {
  return (
    <section id="customers" className="border-y border-ink-100 bg-white py-12">
      <div className="container-page">
        <p className="text-center text-sm font-medium text-ink-500">
          Trusted by field-service teams running thousands of trucks
        </p>
        <div className="mt-8 grid grid-cols-2 items-center gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {LOGOS.map((name) => (
            <div
              key={name}
              className="flex items-center justify-center gap-2 text-center text-sm font-bold tracking-tight text-ink-400 grayscale transition hover:text-ink-600"
            >
              <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-100 text-ink-500">
                {name.charAt(0)}
              </span>
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
