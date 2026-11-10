"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createReview, removeReview, reorderReview, saveReview, showReview } from "@/app/admin/(panel)/reviews/actions";
import { REVIEW_SOURCES, type Review, type ReviewSource } from "@/lib/reviews";
import { inputClass } from "../ui/FormField";
import { AdminHeader, Badge, Card, adminButton, adminButtonQuiet } from "./AdminShell";

type Result = { ok: boolean; message: string };
type ProductOption = { id: string; name: string };

interface FormState {
  quote: string;
  who: string;
  productId: string;
  role: string;
  rating: string;
  orderNumber: string;
  source: ReviewSource | "";
  visible: boolean;
  consent: boolean;
}

const BLANK: FormState = { quote: "", who: "", productId: "", role: "", rating: "", orderNumber: "", source: "", visible: true, consent: false };

const fromReview = (r: Review): FormState => ({
  quote: r.quote,
  who: r.who,
  productId: r.productId ?? "",
  role: r.role ?? "",
  rating: r.rating ? String(r.rating) : "",
  orderNumber: r.orderNumber ?? "",
  source: r.source,
  visible: r.visible,
  consent: true,
});

const label = "text-sm font-semibold text-ink";
const hint = "mt-1 text-xs text-ink-soft";

/** The add and edit form. */
function ReviewForm({
  initial,
  products,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  products: ProductOption[];
  submitLabel: string;
  onSubmit: (form: FormState) => Promise<Result>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState<Result | null>(null);
  const [busy, start] = useTransition();
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await onSubmit(form);
          setMsg(r);
          if (r.ok && !onCancel) setForm(BLANK);
        });
      }}
      className="grid gap-4"
    >
      <label className={label}>
        The customer&rsquo;s words
        <textarea rows={4} value={form.quote} onChange={(e) => set("quote", e.target.value)} className={`${inputClass} h-auto py-3 font-normal`} />
        <span className={`block ${hint} font-normal`}>Copy them as written. Fix spelling only.</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Name to show
          <input value={form.who} onChange={(e) => set("who", e.target.value)} placeholder="e.g. Daniel O." className={`${inputClass} font-normal`} />
          <span className={`block ${hint} font-normal`}>First name and initial is enough.</span>
        </label>
        <label className={label}>
          Product
          <select value={form.productId} onChange={(e) => set("productId", e.target.value)} className={`${inputClass} font-normal`}>
            <option value="">Not about one product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className={`block ${hint} font-normal`}>Its product page shows it too.</span>
        </label>
        <label className={label}>
          Under the name (optional)
          <input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Corporate client" className={`${inputClass} font-normal`} />
          <span className={`block ${hint} font-normal`}>Used when there&rsquo;s no product.</span>
        </label>
        <label className={label}>
          Stars (optional)
          <select value={form.rating} onChange={(e) => set("rating", e.target.value)} className={`${inputClass} font-normal`}>
            <option value="">No stars</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} out of 5
              </option>
            ))}
          </select>
          <span className={`block ${hint} font-normal`}>Only if the customer gave a rating.</span>
        </label>
        <label className={label}>
          Order number (optional)
          <input
            value={form.orderNumber}
            onChange={(e) => set("orderNumber", e.target.value)}
            placeholder="WS-…"
            autoCapitalize="characters"
            className={`${inputClass} font-normal`}
          />
          <span className={`block ${hint} font-normal`}>A paid order shows &ldquo;Verified order&rdquo; on the review.</span>
        </label>
        <label className={label}>
          Where it came from
          <select value={form.source} onChange={(e) => set("source", e.target.value as ReviewSource)} className={`${inputClass} font-normal`}>
            <option value="" disabled>
              Choose
            </option>
            {Object.entries(REVIEW_SOURCES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={form.visible} onChange={(e) => set("visible", e.target.checked)} className="mt-0.5 h-4 w-4 accent-oxblood" />
        Show it on the site
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4 accent-oxblood" />
        The customer agreed to us showing their words and name.
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={adminButton}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-ink-soft underline underline-offset-2">
            Cancel
          </button>
        )}
      </div>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-ink" : "text-oxblood"}`}>
          {msg.message}
        </p>
      )}
    </form>
  );
}

function ReviewRow({ review: r, products, first, last }: { review: Review; products: ProductOption[]; first: boolean; last: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<Result | null>(null);
  const [busy, start] = useTransition();
  const productName = r.productId ? (products.find((p) => p.id === r.productId)?.name ?? "A product no longer listed") : null;

  const run = (action: () => Promise<Result>) =>
    start(async () => {
      const res = await action();
      setMsg(res);
      if (res.ok) router.refresh();
    });

  if (editing)
    return (
      <li className="py-5">
        <ReviewForm
          initial={fromReview(r)}
          products={products}
          submitLabel="Save review"
          onCancel={() => setEditing(false)}
          onSubmit={async (form) => {
            const res = await saveReview(r.id, form);
            if (res.ok) {
              setEditing(false);
              setMsg(res);
              router.refresh();
            }
            return res;
          }}
        />
      </li>
    );

  return (
    <li className={`py-5 ${r.visible ? "" : "opacity-60"}`}>
      <blockquote className="font-display text-lg leading-snug">&ldquo;{r.quote}&rdquo;</blockquote>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <span className="font-semibold text-ink">{r.who}</span>
        <span>· {productName ?? r.role ?? "Customer"}</span>
        {r.rating && <span>· {r.rating} stars</span>}
        {r.verified && <Badge tone="gold">Verified order {r.orderNumber}</Badge>}
        {!r.visible && <Badge tone="quiet">Hidden</Badge>}
        <span>· from {REVIEW_SOURCES[r.source]}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => setEditing(true)} className={`${adminButtonQuiet} h-9 px-4`}>
          Edit
        </button>
        <button type="button" disabled={busy} onClick={() => run(() => showReview(r.id, !r.visible))} className={`${adminButtonQuiet} h-9 px-4`}>
          {r.visible ? "Hide" : "Show"}
        </button>
        <button
          type="button"
          disabled={busy || first}
          onClick={() => run(() => reorderReview(r.id, "up"))}
          className={`${adminButtonQuiet} h-9 px-4`}
          aria-label={`Move ${r.who}'s review up`}
        >
          Move up
        </button>
        <button
          type="button"
          disabled={busy || last}
          onClick={() => run(() => reorderReview(r.id, "down"))}
          className={`${adminButtonQuiet} h-9 px-4`}
          aria-label={`Move ${r.who}'s review down`}
        >
          Move down
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => window.confirm(`Delete ${r.who}'s review? This can't be undone; Hide keeps it.`) && run(() => removeReview(r.id))}
          className="h-9 px-3 text-sm text-oxblood underline underline-offset-2"
        >
          Delete
        </button>
      </div>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-ink-soft" : "text-oxblood"}`}>
          {msg.message}
        </p>
      )}
    </li>
  );
}

/** Add, edit, hide, reorder and delete reviews. The first visible one is the large card on the home page. */
export function ReviewsManager({ reviews, products }: { reviews: Review[]; products: ProductOption[] }) {
  const router = useRouter();
  const shown = reviews.filter((r) => r.visible).length;
  return (
    <div>
      <AdminHeader
        title="Reviews"
        intro={`${shown} of ${reviews.length} on the site. The home page shows the first seven shown, in this order; the first is the large one. Product pages show the ones about them.`}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_24rem]">
        <Card>
          {reviews.length === 0 ? (
            <p className="text-ink-soft">No reviews yet. Add the first one.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {reviews.map((r, i) => (
                <ReviewRow key={r.id} review={r} products={products} first={i === 0} last={i === reviews.length - 1} />
              ))}
            </ul>
          )}
        </Card>
        <Card className="self-start">
          <h2 className="mb-4 text-2xl text-oxblood">Add a review</h2>
          <ReviewForm
            initial={BLANK}
            products={products}
            submitLabel="Add review"
            onSubmit={async (form) => {
              const res = await createReview(form);
              if (res.ok) router.refresh();
              return res;
            }}
          />
        </Card>
      </div>
    </div>
  );
}
