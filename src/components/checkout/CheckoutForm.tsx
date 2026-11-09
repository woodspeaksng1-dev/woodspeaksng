"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { cartSubtotal, lineTotal, useCart, useCartHydrated } from "@/lib/cart-store";
import { findProduct, findZone } from "@/lib/catalog";
import { useCatalog } from "../catalog/CatalogProvider";
import { checkoutSchema, earliestDelivery, type CheckoutInput } from "@/lib/checkout";
import { CONTACT } from "@/lib/contact";
import { formatNaira } from "@/lib/format";
import { OrderLines } from "./OrderLines";
import { Check, TextField, inputClass } from "../ui/FormField";

/** Paystack is connected in the backend stage. Until then "Pay" places a demo order. */
type Field = keyof CheckoutInput;
type Errors = Partial<Record<Field, string>>;

const EMPTY: CheckoutInput = {
  name: "",
  email: "",
  phone: "",
  marketingOptIn: false,
  forSomeoneElse: false,
  recipientName: "",
  recipientPhone: "",
  zoneId: "",
  address: "",
  landmark: "",
  deliveryDate: "",
  hidePrice: false,
};

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-rule pt-8 first:border-t-0 first:pt-0" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="text-2xl text-oxblood">
        <span className="mr-2 text-gold tabular-nums">{n}.</span>
        {title}
      </h2>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

/**
 * One-page guest checkout. Totals here are for display only: on "Pay" the form sends the cart (product
 * IDs, quantities, personalisation) and the details to /api/checkout, which prices the order itself and
 * returns a Paystack payment page. The cart is emptied only once the payment is confirmed.
 */
export function CheckoutForm() {
  const hydrated = useCartHydrated();
  const items = useCart((s) => s.items);
  const catalog = useCatalog();
  const [form, setForm] = useState<CheckoutInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [placing, setPlacing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // After a failed submit, move to the first problem so phone users see what to fix.
  useEffect(() => {
    if (attempt) document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [attempt]);

  if (!hydrated) return <p className="py-24 text-center text-ink-soft">Loading your cart…</p>;

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-4xl text-oxblood">Your cart is empty</h1>
        <p className="mt-4 text-lg text-ink-soft">Find something that says what you mean, then come back here.</p>
        <Link
          href="/shop"
          className="mt-8 inline-flex h-12 items-center rounded-full bg-oxblood px-8 text-vellum transition-colors hover:bg-wine"
        >
          Go to the shop
        </Link>
      </div>
    );

  const set = <K extends Field>(key: K, value: CheckoutInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const zone = findZone(catalog, form.zoneId);
  const perishables = items
    .map((i) => findProduct(catalog, i.productId))
    .filter((p) => p?.perishable)
    .map((p) => p!.name);
  const subtotal = cartSubtotal(items, catalog.products);
  const fee = zone?.fee ?? null;
  const lines = items.map((i) => ({
    key: i.lineId,
    name: findProduct(catalog, i.productId)?.name ?? "Item",
    quantity: i.quantity,
    total: lineTotal(i, catalog.products),
    customization: i.customization,
  }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const result = checkoutSchema(catalog).safeParse(form);
    const next: Errors = {};
    if (!result.success)
      for (const issue of result.error.issues) {
        const key = issue.path[0] as Field;
        next[key] ??= issue.message;
      }
    if (zone && !zone.perishables && perishables.length)
      next.zoneId ??= `We can't get the ${perishables.join(" and ").toLowerCase()} to this area fresh. Choose another area, or remove ${perishables.length > 1 ? "them" : "it"}.`;

    if (Object.keys(next).length || !result.success) {
      setErrors(next);
      setAttempt((n) => n + 1);
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          details: form,
          lines: items.map(({ productId, quantity, customization }) => ({ productId, quantity, customization })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        authorizationUrl?: string;
        message?: string;
        fieldErrors?: Errors;
      };
      if (res.ok && data.authorizationUrl) {
        window.location.assign(data.authorizationUrl); // Paystack's payment page; it sends them back here after
        return;
      }
      if (data.fieldErrors) {
        setErrors(data.fieldErrors);
        setAttempt((n) => n + 1);
      }
      setServerError(data.message ?? "We couldn't start your payment. Try again in a minute.");
    } catch {
      setServerError("We couldn't reach our shop. Check your connection and try again.");
    }
    setPlacing(false);
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-12 md:grid-cols-[1fr_minmax(0,24rem)] md:gap-16">
      <div className="flex flex-col gap-10">
        <h1 className="text-4xl text-oxblood md:text-5xl">Checkout</h1>

        <Section n={1} title="Your details">
          <TextField label="Full name" error={errors.name}>
            {(p) => (
              <input {...p} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
            )}
          </TextField>
          <TextField label="Email" hint="We'll send your order confirmation here." error={errors.email}>
            {(p) => (
              <input
                {...p}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            )}
          </TextField>
          <Check checked={form.marketingOptIn} onChange={(v) => set("marketingOptIn", v)}>
            Send me updates and gift reminders from Woodspeaks.
          </Check>
          <TextField label="Phone" hint="For delivery questions only." error={errors.phone}>
            {(p) => (
              <input
                {...p}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0803 123 4567"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            )}
          </TextField>
        </Section>

        <Section n={2} title="Who is it for?">
          <Check checked={form.forSomeoneElse} onChange={(v) => set("forSomeoneElse", v)}>
            I&rsquo;m sending this to someone else
          </Check>
          {form.forSomeoneElse && (
            <>
              <TextField label="Their name" error={errors.recipientName}>
                {(p) => (
                  <input {...p} value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} className={inputClass} />
                )}
              </TextField>
              <TextField label="Their phone" hint="Our rider calls them on the day." error={errors.recipientPhone}>
                {(p) => (
                  <input
                    {...p}
                    type="tel"
                    inputMode="tel"
                    value={form.recipientPhone}
                    onChange={(e) => set("recipientPhone", e.target.value)}
                    className={inputClass}
                  />
                )}
              </TextField>
            </>
          )}
        </Section>

        <Section n={3} title="Delivery">
          <TextField
            label="Delivery area"
            hint={
              <>
                We deliver to these areas of Lagos. Not on the list?{" "}
                <a href={CONTACT.whatsappUrl("Hello Woodspeaks, do you deliver to my area?")} className="text-oxblood underline underline-offset-2" rel="noopener">
                  Ask us on WhatsApp
                </a>
                .
              </>
            }
            error={errors.zoneId}
          >
            {(p) => (
              <select {...p} value={form.zoneId} onChange={(e) => set("zoneId", e.target.value)} className={inputClass}>
                <option value="" disabled>
                  Choose an area
                </option>
                {catalog.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                    {z.fee != null ? ` (${formatNaira(z.fee)})` : ""}
                  </option>
                ))}
              </select>
            )}
          </TextField>
          <TextField label="Full address" error={errors.address}>
            {(p) => (
              <textarea
                {...p}
                rows={3}
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={`${inputClass} h-auto py-3`}
              />
            )}
          </TextField>
          <TextField label="Nearest landmark (optional)" error={errors.landmark}>
            {(p) => (
              <input
                {...p}
                placeholder="e.g. opposite the Total filling station"
                value={form.landmark}
                onChange={(e) => set("landmark", e.target.value)}
                className={inputClass}
              />
            )}
          </TextField>
          <TextField
            label="Preferred delivery date"
            hint={`Each gift takes ${catalog.craftingDays} days to make by hand.`}
            error={errors.deliveryDate}
          >
            {(p) => (
              <input
                {...p}
                type="date"
                min={earliestDelivery(catalog.craftingDays)}
                value={form.deliveryDate}
                onChange={(e) => set("deliveryDate", e.target.value)}
                className={inputClass}
              />
            )}
          </TextField>
        </Section>

        <Section n={4} title="Gift options">
          <Check checked={form.hidePrice} onChange={(v) => set("hidePrice", v)}>
            Don&rsquo;t include the price in the package
          </Check>
        </Section>
      </div>

      <aside className="md:sticky md:top-24 md:self-start" aria-labelledby="summary">
        <div className="rounded-[1.6rem] bg-vellum p-6 shadow-card">
          <h2 id="summary" className="text-2xl text-oxblood">
            Your order
          </h2>
          <div className="mt-5">
            <OrderLines lines={lines} />
          </div>
          <dl className="mt-2 flex flex-col gap-2 border-t border-rule pt-4 text-ink">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatNaira(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Delivery</dt>
              <dd className="text-right text-ink-soft">
                {!zone ? "Choose an area" : fee != null ? formatNaira(fee) : "We'll confirm the fee"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-rule pt-3 font-display text-xl">
              <dt>{fee != null ? "Total" : "Total before delivery"}</dt>
              <dd className="tabular-nums">{formatNaira(subtotal + (fee ?? 0))}</dd>
            </div>
          </dl>
          <button
            type="submit"
            disabled={placing}
            className="mt-6 h-12 w-full rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine disabled:opacity-60"
          >
            {placing ? "Opening Paystack…" : fee != null ? `Pay ${formatNaira(subtotal + fee)}` : "Pay with Paystack"}
          </button>
          {serverError && (
            <p role="alert" className="mt-3 text-center text-sm text-oxblood">
              {serverError}
            </p>
          )}
          <p className="mt-3 text-center text-sm text-ink-soft">Card, bank transfer or USSD, securely through Paystack.</p>
        </div>
      </aside>
    </form>
  );
}
