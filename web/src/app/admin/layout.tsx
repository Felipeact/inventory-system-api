import type { Metadata } from "next";

/** The operator console must never be indexed by search engines. */
export const metadata: Metadata = {
  title: "Platform Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-ink-50">{children}</div>;
}
