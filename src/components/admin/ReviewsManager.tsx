"use client";

import { useState } from "react";
import { PRODUCTS, getProductBySlug } from "@/lib/catalog";
import { useAdmin } from "@/lib/admin/store";
import { Check, TextField, inputClass } from "../ui/FormField";
import { AdminHeader, Badge, Card, adminButton, adminButtonQuiet } from "./AdminShell";

const EMPTY = { quote: "", who: "", productSlug: "", rating: "5", consent: false };

export function ReviewsManager() {
  const { reviews, addReview, setReviewApproved } = useAdmin();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.quote.trim().length < 10) return setError("Paste the customer's words, as they wrote them.");
    if (form.who.trim().length < 2) return setError("Add their first name and area, e.g. Chioma, Ikeja.");
    if (!form.consent) return setError("Confirm the customer agreed to have this shown.");
    addReview({
      quote: form.quote.trim(),
      who: form.who.trim(),
      productSlug: form.productSlug || undefined,
      rating: Number(form.rating) as 1 | 2 | 3 | 4 | 5,
    });
    setForm(EMPTY);
    setError(null);
  };

  return (
    <div>
      <AdminHeader
        title="Reviews"
        intro="Real reviews only, in the customer's own words, with their OK. Approved reviews appear in “What they say about us”."
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <h2 className="text-2xl text-oxblood">All reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-ink-soft">
              No reviews yet. Add one when a customer sends kind words on WhatsApp, Instagram or by email. After the
              backend is live, customers are also asked for a review a few days after delivery.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-rule">
              {reviews.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg">&ldquo;{r.quote}&rdquo;</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {r.who}{r.rating && ` · ${r.rating} stars`}{r.productSlug && ` · ${getProductBySlug(r.productSlug)?.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={r.approved ? "gold" : "quiet"}>{r.approved ? "On the site" : "Not shown"}</Badge>
                    <button type="button" onClick={() => setReviewApproved(r.id, !r.approved)} className={r.approved ? adminButtonQuiet : adminButton}>
                      {r.approved ? "Hide" : "Approve"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="self-start">
          <form onSubmit={add} noValidate className="flex flex-col gap-4">
            <h2 className="text-2xl text-oxblood">Add a review</h2>
            <TextField label="Their words">
              {(p) => (
                <textarea {...p} rows={4} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} className={`${inputClass} h-auto py-3`} />
              )}
            </TextField>
            <TextField label="Name shown" hint="First name and area only.">
              {(p) => <input {...p} value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value })} className={inputClass} />}
            </TextField>
            <TextField label="Product (optional)">
              {(p) => (
                <select {...p} value={form.productSlug} onChange={(e) => setForm({ ...form, productSlug: e.target.value })} className={inputClass}>
                  <option value="">None</option>
                  {PRODUCTS.map((pr) => (
                    <option key={pr.id} value={pr.slug}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              )}
            </TextField>
            <TextField label="Stars">
              {(p) => (
                <select {...p} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className={inputClass}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              )}
            </TextField>
            <Check checked={form.consent} onChange={(v) => setForm({ ...form, consent: v })}>
              The customer agreed to have this shown on the site.
            </Check>
            {error && (
              <p role="alert" className="text-sm text-oxblood">
                {error}
              </p>
            )}
            <button type="submit" className={adminButton}>
              Add review
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
