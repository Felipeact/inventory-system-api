import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/** Brand wordmark with an inline SVG glyph (a stacked-box / pilot mark). */
export function Logo({
  className,
  href = "/",
  invert = false,
}: {
  className?: string;
  href?: string | null;
  invert?: boolean;
}) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5 font-bold", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M3 6.5 12 11m0 0 9-4.5M12 11v11"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={cn("text-lg tracking-tight", invert ? "text-white" : "text-ink-900")}>
        {BRAND.name}
      </span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      {inner}
    </Link>
  );
}
