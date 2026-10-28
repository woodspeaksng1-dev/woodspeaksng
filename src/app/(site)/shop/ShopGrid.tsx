"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OCCASION_LABELS, PRODUCTS, RECIPIENT_LABELS } from "@/lib/catalog";
import type { Occasion, Recipient } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";

type Sort = "featured" | "price-asc" | "price-desc";

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<T, string>;
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 w-20 text-sm text-ink-soft">{label}</span>
      {(Object.keys(options) as T[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(value === key ? null : key)}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
            value === key ? "border-oxblood bg-oxblood text-vellum" : "border-rule hover:border-oxblood"
          }`}
        >
          {options[key]}
        </button>
      ))}
    </div>
  );
}

export function ShopGrid({ personalisedOnly }: { personalisedOnly: boolean }) {
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [onlyPersonalised, setOnlyPersonalised] = useState(personalisedOnly);
  const [sort, setSort] = useState<Sort>("featured");

  const products = useMemo(() => {
    const list = PRODUCTS.filter(
      (p) =>
        (!occasion || p.occasions.includes(occasion)) &&
        (!recipient || p.recipients.includes(recipient)) &&
        (!onlyPersonalised || p.personalization.kind !== "none"),
    );
    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    return [...list].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  }, [occasion, recipient, onlyPersonalised, sort]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 border-y border-rule py-5">
        <FilterRow label="Occasion" options={OCCASION_LABELS} value={occasion} onChange={setOccasion} />
        <FilterRow label="For" options={RECIPIENT_LABELS} value={recipient} onChange={setRecipient} />
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyPersonalised}
              onChange={(e) => setOnlyPersonalised(e.target.checked)}
              className="h-4 w-4 accent-oxblood"
            />
            Only gifts I can personalise
          </label>
          <label className="flex items-center gap-2 text-sm">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-10 rounded-full border border-rule bg-vellum px-3 text-base"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
            </select>
          </label>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display text-2xl">No gifts match those filters.</p>
          <button
            type="button"
            onClick={() => {
              setOccasion(null);
              setRecipient(null);
              setOnlyPersonalised(false);
            }}
            className="mt-4 text-oxblood underline underline-offset-4"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 md:gap-x-8 md:gap-y-12 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Reads ?personalised=1 (used by the wizard's "Write my message" link). Wrap in <Suspense>. */
export function ShopGridFromParams() {
  const params = useSearchParams();
  return <ShopGrid personalisedOnly={params.get("personalised") === "1"} />;
}
