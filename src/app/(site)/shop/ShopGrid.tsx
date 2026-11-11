"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OCCASION_LABELS, RECIPIENT_LABELS } from "@/lib/catalog";
import { useCatalog } from "@/components/catalog/CatalogProvider";
import type { Occasion, Recipient } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";

type Sort = "featured" | "price-asc" | "price-desc";

const pill = "h-10 rounded-full border text-sm transition-colors";
const pillOn = "border-oxblood bg-oxblood text-vellum";
const pillOff = "border-rule bg-vellum text-ink hover:border-oxblood";

/** A filter as one small pill that opens the phone's own picker. Empty value means any. */
function FilterSelect<T extends string>({
  label,
  anyLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  anyLabel: string;
  options: Record<T, string>;
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
        className={`${pill} ${value ? pillOn : pillOff} cursor-pointer appearance-none pr-9 pl-4`}
      >
        <option value="">{anyLabel}</option>
        {(Object.keys(options) as T[]).map((key) => (
          <option key={key} value={key}>
            {options[key]}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute top-1/2 right-3.5 h-3 w-3 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2.5 4.5 6 8l3.5-3.5" className={value ? "text-vellum" : "text-ink-soft"} />
      </svg>
    </label>
  );
}

export function ShopGrid({ personalisedOnly }: { personalisedOnly: boolean }) {
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [onlyPersonalised, setOnlyPersonalised] = useState(personalisedOnly);
  const [sort, setSort] = useState<Sort>("featured");
  const catalog = useCatalog();

  const products = useMemo(() => {
    const list = catalog.products.filter(
      (p) =>
        (!occasion || p.occasions.includes(occasion)) &&
        (!recipient || p.recipients.includes(recipient)) &&
        (!onlyPersonalised || p.personalization.kind !== "none"),
    );
    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    return [...list].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  }, [catalog.products, occasion, recipient, onlyPersonalised, sort]);

  const filtered = !!occasion || !!recipient || onlyPersonalised;
  const clear = () => {
    setOccasion(null);
    setRecipient(null);
    setOnlyPersonalised(false);
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-rule pb-4">
        <FilterSelect label="Occasion" anyLabel="Any occasion" options={OCCASION_LABELS} value={occasion} onChange={setOccasion} />
        <FilterSelect label="Who it's for" anyLabel="Anyone" options={RECIPIENT_LABELS} value={recipient} onChange={setRecipient} />
        <button
          type="button"
          aria-pressed={onlyPersonalised}
          onClick={() => setOnlyPersonalised((v) => !v)}
          className={`${pill} ${onlyPersonalised ? pillOn : pillOff} px-4`}
        >
          Personalisable
        </button>
        <label className="relative ml-auto inline-flex items-center gap-2 text-sm text-ink-soft">
          <span className="hidden sm:inline">Sort</span>
          <span className="sr-only sm:hidden">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className={`${pill} ${pillOff} cursor-pointer appearance-none pr-9 pl-4`}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Lowest price</option>
            <option value="price-desc">Highest price</option>
          </select>
          <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute top-1/2 right-3.5 h-3 w-3 -translate-y-1/2 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2.5 4.5 6 8l3.5-3.5" />
          </svg>
        </label>
        {filtered && (
          <p className="flex w-full items-center gap-3 pt-1 text-sm text-ink-soft" role="status">
            {products.length} {products.length === 1 ? "gift" : "gifts"}
            <button type="button" onClick={clear} className="text-oxblood underline underline-offset-2">
              Clear
            </button>
          </p>
        )}
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display text-2xl">No gifts match those filters.</p>
          <button
            type="button"
            onClick={clear}
            className="mt-4 text-oxblood underline underline-offset-4"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 md:gap-x-8 md:gap-y-12 lg:grid-cols-4">
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

/** Reads ?personalised=1 (used by Mudi's "Write my message" link). Wrap in <Suspense>. */
export function ShopGridFromParams() {
  const params = useSearchParams();
  return <ShopGrid personalisedOnly={params.get("personalised") === "1"} />;
}
