"use client";

import Link from "next/link";
import { useState } from "react";
import { OCCASION_LABELS, RECIPIENT_LABELS } from "@/lib/catalog";
import { HOME_FEATURED_MAX, useAdmin, type AdminProduct } from "@/lib/admin/store";
import type { Occasion, Personalization, Recipient } from "@/lib/types";
import { ProductImage } from "../product/ProductImage";
import { Check, TextField, inputClass } from "../ui/FormField";
import { Card, adminButton } from "./AdminShell";

function Tags<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<T, string>;
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(options) as T[]).map((k) => {
          const on = value.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${on ? "border-oxblood bg-oxblood text-vellum" : "border-rule bg-vellum text-ink"}`}
            >
              {options[k]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

export function ProductEditor({ slug }: { slug: string }) {
  const saved = useAdmin((s) => s.products.find((p) => p.slug === slug));
  const updateProduct = useAdmin((s) => s.updateProduct);
  const featuredCount = useAdmin((s) => s.products.filter((p) => p.featured).length);
  const [draft, setDraft] = useState<AdminProduct | undefined>(saved);
  const [price, setPrice] = useState(String(saved?.price ?? ""));
  const [status, setStatus] = useState<string | null>(null);

  if (!saved || !draft) return <p className="py-20 text-center text-ink-soft">Product not found.</p>;

  const set = <K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) => {
    setStatus(null);
    setDraft((d) => d && { ...d, [key]: value });
  };
  const setLimit = (patch: Partial<Personalization>) =>
    set("personalization", { ...draft.personalization, ...patch } as Personalization);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const p = num(price);
    if (!Number.isInteger(p) || p <= 0) return setStatus("Enter the price in naira as a whole number, e.g. 15590.");
    if (draft.name.trim().length < 2) return setStatus("Give the product a name.");
    const next: AdminProduct = { ...draft, price: p };
    const patch = Object.fromEntries(
      Object.entries(next).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(saved[k as keyof AdminProduct])),
    ) as Partial<AdminProduct>;
    if (Object.keys(patch).length === 0) return setStatus("No changes to save.");
    if (patch.featured && featuredCount >= HOME_FEATURED_MAX)
      return setStatus(`The home page shows ${HOME_FEATURED_MAX} products. Take one off in Homepage first.`);
    updateProduct(saved.id, patch);
    setStatus("Saved. The shop shows these changes once products are stored online (backend stage).");
  };

  const pz = draft.personalization;

  return (
    <form onSubmit={save} noValidate>
      <Link href="/admin/products" className="text-sm text-ink-soft underline underline-offset-2">
        All products
      </Link>
      <h1 className="mt-3 text-4xl text-oxblood">{saved.name}</h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Card className="self-start">
          <ProductImage product={saved} className="rounded-xl" />
          <label className={`mt-4 w-full cursor-pointer ${adminButton}`}>
            Replace photo
            <input type="file" accept="image/*" className="sr-only" onChange={() => setStatus("Photo uploads arrive with the backend stage.")} />
          </label>
          <div className="mt-4 flex flex-col gap-3">
            <Check checked={!!draft.featured} onChange={(v) => set("featured", v)}>
              Show on the home page
            </Check>
            <Check checked={draft.hidden} onChange={(v) => set("hidden", v)}>
              Hide from the shop
            </Check>
            <Check checked={!!draft.addOn} onChange={(v) => set("addOn", v)}>
              Can be added to other gifts
            </Check>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-5">
            <h2 className="text-2xl text-oxblood">Details</h2>
            <TextField label="Name">
              {(p) => <input {...p} value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />}
            </TextField>
            <TextField label="Price (₦)" hint="Whole naira. Checkout always takes the price from here, never from the browser.">
              {(p) => <input {...p} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />}
            </TextField>
            <TextField label="Description">
              {(p) => (
                <textarea {...p} rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} className={`${inputClass} h-auto py-3`} />
              )}
            </TextField>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Dimensions" hint="e.g. 30 cm long, 8 cm across">
                {(p) => <input {...p} value={draft.dimensions} onChange={(e) => set("dimensions", e.target.value)} className={inputClass} />}
              </TextField>
              <TextField label="What's included" hint="e.g. scroll, wax seal, gift box">
                {(p) => <input {...p} value={draft.included} onChange={(e) => set("included", e.target.value)} className={inputClass} />}
              </TextField>
            </div>
          </Card>

          <Card className="flex flex-col gap-5">
            <h2 className="text-2xl text-oxblood">Who and when</h2>
            <Tags<Occasion> label="Occasions" options={OCCASION_LABELS} value={draft.occasions} onChange={(v) => set("occasions", v)} />
            <Tags<Recipient> label="For" options={RECIPIENT_LABELS} value={draft.recipients} onChange={(v) => set("recipients", v)} />
          </Card>

          {pz.kind !== "none" && (
            <Card className="flex flex-col gap-5">
              <h2 className="text-2xl text-oxblood">Personalisation limits</h2>
              {pz.kind === "letter" && (
                <TextField label="Most words in the letter">
                  {(p) => (
                    <input {...p} inputMode="numeric" value={pz.maxWords} onChange={(e) => setLimit({ maxWords: num(e.target.value) || 0 })} className={inputClass} />
                  )}
                </TextField>
              )}
              {pz.kind === "reasons" && (
                <div className="grid gap-5 sm:grid-cols-3">
                  <TextField label="Number of reasons">
                    {(p) => <input {...p} inputMode="numeric" value={pz.count} onChange={(e) => setLimit({ count: num(e.target.value) || 0 })} className={inputClass} />}
                  </TextField>
                  <TextField label="Words per reason">
                    {(p) => (
                      <input {...p} inputMode="numeric" value={pz.maxWordsEach} onChange={(e) => setLimit({ maxWordsEach: num(e.target.value) || 0 })} className={inputClass} />
                    )}
                  </TextField>
                  <TextField label="Write-your-own fee (₦)">
                    {(p) => <input {...p} inputMode="numeric" value={pz.fee} onChange={(e) => setLimit({ fee: num(e.target.value) || 0 })} className={inputClass} />}
                  </TextField>
                </div>
              )}
              {pz.kind === "photo" && (
                <TextField label="Photos per item">
                  {(p) => (
                    <input {...p} inputMode="numeric" value={pz.maxPhotos} onChange={(e) => setLimit({ maxPhotos: num(e.target.value) || 0 })} className={inputClass} />
                  )}
                </TextField>
              )}
            </Card>
          )}

          <Card className="flex flex-col gap-5">
            <h2 className="text-2xl text-oxblood">Search and sharing</h2>
            <TextField label="Search title" hint="Shown in Google results. Around 60 characters.">
              {(p) => <input {...p} value={draft.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className={inputClass} />}
            </TextField>
            <TextField label="Photo description" hint="Read aloud to people using screen readers. Describe what's in the photo.">
              {(p) => <input {...p} value={draft.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} className={inputClass} />}
            </TextField>
          </Card>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className={adminButton}>
              Save changes
            </button>
            {status && (
              <p role="status" className="text-sm text-ink">
                {status}
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
