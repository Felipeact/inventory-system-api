"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Boxes, HardHat, Truck } from "lucide-react";
import { api } from "@/lib/api";
import type { Product, Asset, Truck as TruckT } from "@/lib/types";
import { PageHeader, Loading } from "@/components/app/ui";

/** Client-side global search across products, assets, and trucks. */
export default function SearchPage() {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [trucks, setTrucks] = useState<TruckT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, a, t] = await Promise.allSettled([
        api.listProducts(),
        api.listAssets(),
        api.listTrucks(),
      ]);
      if (p.status === "fulfilled") setProducts(p.value);
      if (a.status === "fulfilled") setAssets(a.value);
      if (t.status === "fulfilled") setTrucks(t.value);
      setLoading(false);
    })();
  }, []);

  const term = q.trim().toLowerCase();
  const has = (...vals: (string | null | undefined)[]) =>
    term.length === 0 ||
    vals.some((v) => (v ?? "").toLowerCase().includes(term));

  const pHits = useMemo(
    () => (term ? products.filter((p) => has(p.name, p.barcode, p.model, p.type)) : []),
    [products, term],
  );
  const aHits = useMemo(
    () => (term ? assets.filter((a) => has(a.name, a.serialCode, a.type, a.status)) : []),
    [assets, term],
  );
  const tHits = useMemo(
    () => (term ? trucks.filter((t) => has(t.truckNumber, t.plateNumber, t.status)) : []),
    [trucks, term],
  );

  const total = pHits.length + aHits.length + tHits.length;

  return (
    <div>
      <PageHeader title="Search" description="Find products, assets, and trucks across your company." />

      <div className="relative mb-5">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          autoFocus
          className="input pl-10"
          placeholder="Search products, assets, trucks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <Loading label="Indexing…" />
      ) : term.length === 0 ? (
        <p className="text-sm text-ink-500">Type to search across your inventory, tools, and fleet.</p>
      ) : total === 0 ? (
        <p className="text-sm text-ink-500">No matches for “{q}”.</p>
      ) : (
        <div className="space-y-5">
          <Group icon={<Boxes size={16} />} title="Products" href="/products" count={pHits.length}>
            {pHits.slice(0, 50).map((p) => (
              <Row key={p.id} label={p.name} sub={p.barcode} />
            ))}
          </Group>
          <Group icon={<HardHat size={16} />} title="Assets" href="/assets" count={aHits.length}>
            {aHits.slice(0, 50).map((a) => (
              <Row key={a.id} label={a.name} sub={`${a.type}${a.serialCode ? ` · SN ${a.serialCode}` : ""}`} />
            ))}
          </Group>
          <Group icon={<Truck size={16} />} title="Trucks" href="/trucks" count={tHits.length}>
            {tHits.slice(0, 50).map((t) => (
              <Row key={t.id} label={`Truck ${t.truckNumber}`} sub={t.plateNumber ?? undefined} />
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}

function Group({
  icon,
  title,
  href,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  count: number;
  children: React.ReactNode[];
}) {
  if (count === 0) return null;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-ink-500">{icon}</span>
          <h2 className="text-sm font-semibold text-ink-900">
            {title} <span className="text-ink-400">({count})</span>
          </h2>
        </div>
        <Link href={href} className="text-xs font-medium text-brand-600 hover:text-brand-700">
          Open
        </Link>
      </div>
      <ul className="divide-y divide-ink-100">{children}</ul>
    </div>
  );
}

function Row({ label, sub }: { label: string; sub?: string }) {
  return (
    <li className="px-5 py-2.5 text-sm">
      <span className="font-medium text-ink-800">{label}</span>
      {sub ? <span className="ml-2 text-ink-400">{sub}</span> : null}
    </li>
  );
}
