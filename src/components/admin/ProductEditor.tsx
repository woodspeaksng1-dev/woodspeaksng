"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProduct } from "@/app/admin/(panel)/catalog-actions";
import { OCCASION_LABELS, RECIPIENT_LABELS } from "@/lib/catalog";
import type { Occasion, Personalization, Product, Recipient } from "@/lib/types";
import { Check, TextField, inputClass } from "../ui/FormField";
import { Card, adminButton } from "./AdminShell";
import { ProductPhoto } from "./ProductPhoto";

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

const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v));

interface Draft {
  name: string;
  price: string;
  description: string;
  dimensions: string;
  included: string;
  occasions: Occasion[];
  recipients: Recipient[];
  personalization: Personalization;
  featured: boolean;
  hidden: boolean;
  addOn: boolean;
  perishable: boolean;
  seoTitle: string;
  imageAlt: string;
}

const draftOf = (p: Product): Draft => ({
  name: p.name,
  price: String(p.price),
  description: p.description,
  dimensions: p.dimensions ?? "",
  included: p.included ?? "",
  occasions: p.occasions,
  recipients: p.recipients,
  personalization: p.personalization,
  featured: !!p.featured,
  hidden: !!p.hidden,
  addOn: !!p.addOn,
  perishable: !!p.perishable,
  seoTitle: p.seoTitle ?? "",
  imageAlt: p.imageAlt ?? "",
});

/** Edit one product. Saving goes through the server, which checks everything and updates the shop at once. */
export function ProductEditor({ product }: { product: Product }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => draftOf(product));
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setStatus(null);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const setLimit = (patch: Partial<Personalization>) => set("personalization", { ...draft.personalization, ...patch } as Personalization);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startSaving(async () => {
      const result = await saveProduct(product.id, { ...draft, price: num(draft.price) });
      setStatus({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  };

  const pz = draft.personalization;
  const limitInput = (value: number, onValue: (n: number) => void) =>
    function LimitField(p: { id: string }) {
      return (
        <input {...p} inputMode="numeric" value={Number.isNaN(value) ? "" : value} onChange={(e) => onValue(num(e.target.value))} className={inputClass} />
      );
    };

  return (
    <form onSubmit={save} noValidate>
      <Link href="/admin/products" className="-my-2.5 inline-block py-2.5 text-sm text-ink-soft underline underline-offset-2">
        All products
      </Link>
      <h1 className="mt-3 text-4xl text-oxblood">{product.name}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        <Link href={`/products/${product.slug}`} className="underline underline-offset-2" target="_blank">
          See it in the shop
        </Link>
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Card className="self-start">
          <ProductPhoto product={product} />
          <div className="mt-4 flex flex-col gap-3">
            <Check checked={draft.featured} onChange={(v) => set("featured", v)}>
              Show on the home page
            </Check>
            <Check checked={draft.hidden} onChange={(v) => set("hidden", v)}>
              Hide from the shop
            </Check>
            <Check checked={draft.addOn} onChange={(v) => set("addOn", v)}>
              Can be added to other gifts
            </Check>
            <Check checked={draft.perishable} onChange={(v) => set("perishable", v)}>
              Fresh item (only to areas that take cake and flowers)
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
              {(p) => <input {...p} inputMode="numeric" value={draft.price} onChange={(e) => set("price", e.target.value)} className={inputClass} />}
            </TextField>
            <TextField label="Description">
              {(p) => (
                <textarea {...p} rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} className={`${inputClass} h-auto py-3`} />
              )}
            </TextField>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Size" hint="e.g. 30 cm long, 8 cm across">
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
              {pz.kind === "letter" && <TextField label="Most words in the letter">{limitInput(pz.maxWords, (n) => setLimit({ maxWords: n }))}</TextField>}
              {pz.kind === "reasons" && (
                <div className="grid gap-5 sm:grid-cols-3">
                  <TextField label="Number of reasons">{limitInput(pz.count, (n) => setLimit({ count: n }))}</TextField>
                  <TextField label="Words per reason">{limitInput(pz.maxWordsEach, (n) => setLimit({ maxWordsEach: n }))}</TextField>
                  <TextField label="Write-your-own fee (₦)">{limitInput(pz.fee, (n) => setLimit({ fee: n }))}</TextField>
                </div>
              )}
              {pz.kind === "photo" && <TextField label="Photos per item">{limitInput(pz.maxPhotos, (n) => setLimit({ maxPhotos: n }))}</TextField>}
              {pz.kind === "video" && <TextField label="Largest video (MB)">{limitInput(pz.maxMb, (n) => setLimit({ maxMb: n }))}</TextField>}
            </Card>
          )}

          <Card className="flex flex-col gap-5">
            <h2 className="text-2xl text-oxblood">Search and sharing</h2>
            <TextField label="Search title" hint="Shown in Google results. Around 60 characters. Leave empty to use the name.">
              {(p) => <input {...p} value={draft.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className={inputClass} />}
            </TextField>
            <TextField label="Photo description" hint="Read aloud to people using screen readers. Leave empty to use the name.">
              {(p) => <input {...p} value={draft.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} className={inputClass} />}
            </TextField>
          </Card>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={saving} className={adminButton}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            {status && (
              <p role={status.ok ? "status" : "alert"} className={`text-sm ${status.ok ? "text-ink" : "text-oxblood"}`}>
                {status.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
