"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQS } from "@/lib/plans";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24">
      <div className="container-page max-w-3xl">
        <div className="text-center">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Questions, answered
          </h2>
        </div>
        <div className="mt-12 divide-y divide-ink-100 rounded-2xl border border-ink-200">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-ink-900">{item.q}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-ink-400 transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-[15px] leading-relaxed text-ink-600">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
