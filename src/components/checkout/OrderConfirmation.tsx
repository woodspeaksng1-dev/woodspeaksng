"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { remindNextYear } from "@/app/(site)/checkout/confirmation/actions";
import { useCart } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import type { OrderSummary } from "@/lib/orders";
import { OrderLines } from "./OrderLines";

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
};

/**
 * A paid order, as the server confirmed it with Paystack. Empties the cart, since it's been bought.
 * Shows no phone numbers or street address: the link is in the confirmation email and can be shared.
 * `reminderFor` is the date of the yearly reminder, if one is already set for this order.
 */
export function OrderConfirmation({ summary: order, reminderFor }: { summary: OrderSummary; reminderFor: string | null }) {
  const [reminder, setReminder] = useState(reminderFor);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  useEffect(() => useCart.getState().clear(), []);

  return (
    <article>
      <p className="text-sm text-ink-soft">Order {order.number}</p>
      <h1 className="mt-2 text-4xl text-oxblood md:text-5xl">Thank you, {order.firstName}</h1>
      <p className="mt-4 text-lg text-ink">
        We&rsquo;ve received your payment and started on your order. A confirmation is on its way to{" "}
        <strong>{order.email}</strong>.
      </p>

      <dl className="mt-10 grid gap-x-8 gap-y-4 rounded-[1.6rem] bg-vellum p-6 shadow-card sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink-soft">Expected delivery</dt>
          <dd className="font-display text-xl">{longDate(order.deliveryDate)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Delivering to</dt>
          <dd>
            {order.deliverTo}, {order.zoneName}
          </dd>
        </div>
        {order.hidePrice && (
          <div className="sm:col-span-2">
            <dt className="sr-only">Gift option</dt>
            <dd className="text-ink-soft">The price won&rsquo;t be in the package.</dd>
          </div>
        )}
      </dl>

      <section className="mt-10" aria-labelledby="items">
        <h2 id="items" className="text-2xl text-oxblood">
          What we&rsquo;re making
        </h2>
        <div className="mt-5">
          <OrderLines lines={order.lines.map((l, i) => ({ ...l, key: String(i) }))} />
        </div>
        <dl className="flex flex-col gap-2 border-t border-rule pt-4">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatNaira(order.itemsTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd className="tabular-nums">{formatNaira(order.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3 font-display text-xl">
            <dt>Total paid</dt>
            <dd className="tabular-nums">{formatNaira(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-12 rounded-[1.6rem] border border-rule p-6" aria-labelledby="remind">
        <h2 id="remind" className="text-2xl text-oxblood">
          Remind you next year?
        </h2>
        {reminder ? (
          <p className="mt-3 text-ink" role="status">
            Done. We&rsquo;ll email you a week before {longDate(reminder)}, and each year after. Every reminder has a link to stop them.
          </p>
        ) : (
          <>
            <p className="mt-3 text-ink-soft">We&rsquo;ll email you a week before this date each year, so it never slips by.</p>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                start(async () => {
                  const r = await remindNextYear(order.number).catch(() => ({ ok: false, message: "We couldn't set that just now. Try again in a moment." }));
                  if (r.ok && "nextOccasion" in r && r.nextOccasion) setReminder(r.nextOccasion);
                  else setReminderError(r.message);
                })
              }
              className="mt-5 h-11 rounded-full bg-oxblood px-7 text-vellum transition-colors hover:bg-wine disabled:opacity-60"
            >
              {saving ? "Setting your reminder…" : "Yes, remind me"}
            </button>
            {reminderError && (
              <p role="alert" className="mt-3 text-sm text-oxblood">
                {reminderError}
              </p>
            )}
          </>
        )}
      </section>

      <Link href="/shop" className="mt-12 inline-block text-oxblood underline underline-offset-4">
        Continue shopping
      </Link>
    </article>
  );
}
