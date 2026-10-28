"use client";

import { useState } from "react";
import { HOME_FEATURED_MAX, useAdmin } from "@/lib/admin/store";
import { getProductBySlug } from "@/lib/catalog";
import { BRANDS } from "../home/TrustedBy";
import { MomentMedia } from "../media/MomentMedia";
import { AdminHeader, Card, adminButtonQuiet } from "./AdminShell";

export function HomepageEditor() {
  const { products, moments, toggleFeatured, moveMoment } = useAdmin();
  const [note, setNote] = useState<string | null>(null);
  const featured = products.filter((p) => p.featured).length;

  return (
    <div>
      <AdminHeader title="Homepage" intro="Choose what the home page shows. Changes go live as soon as you make them (once the backend is connected)." />

      <Card className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl text-oxblood">Our items</h2>
          <p className="text-sm text-ink-soft tabular-nums">
            {featured} of {HOME_FEATURED_MAX} chosen
          </p>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {products
            .filter((p) => !p.hidden)
            .map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-rule px-3 py-2.5 hover:border-oxblood">
                  <input
                    type="checkbox"
                    checked={!!p.featured}
                    onChange={() => setNote(toggleFeatured(p.id))}
                    className="h-5 w-5 accent-oxblood"
                  />
                  {p.name}
                </label>
              </li>
            ))}
        </ul>
        {note && (
          <p role="status" className="mt-3 text-sm text-oxblood">
            {note}
          </p>
        )}
      </Card>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl text-oxblood">Customer moments</h2>
          <label className={`cursor-pointer ${adminButtonQuiet}`}>
            Add a moment
            <input type="file" accept="image/*,video/mp4" className="sr-only" onChange={() => setNote("Uploads arrive with the backend stage.")} />
          </label>
        </div>
        <p className="mt-1 text-sm text-ink-soft">Only with the customer&rsquo;s permission. The first ones show first.</p>
        <ol className="mt-4 flex flex-col gap-2">
          {moments.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-rule p-2">
              <MomentMedia mediaKey={`gallery/${m.id}`} label={m.caption} tone={i} className="h-16 w-14 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{m.caption}</span>
                <span className="text-sm text-ink-soft">{getProductBySlug(m.productSlug ?? "")?.name ?? "No product"}</span>
              </span>
              <span className="flex gap-1">
                <button type="button" aria-label={`Move "${m.caption}" up`} disabled={i === 0} onClick={() => moveMoment(m.id, -1)} className="h-9 w-9 rounded-full border border-rule disabled:opacity-30">
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move "${m.caption}" down`}
                  disabled={i === moments.length - 1}
                  onClick={() => moveMoment(m.id, 1)}
                  className="h-9 w-9 rounded-full border border-rule disabled:opacity-30"
                >
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-4">
        <h2 className="text-2xl text-oxblood">Brand logos</h2>
        <p className="mt-1 text-sm text-ink-soft">Shown under &ldquo;Trusted by top brands&rdquo;. Only with the brand&rsquo;s permission.</p>
        <ul className="mt-4 flex flex-wrap gap-3">
          {BRANDS.map((b) => (
            <li key={b.key} className="flex h-14 items-center rounded-xl bg-oxblood px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src!} alt={b.name} className="h-7 w-auto" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
