"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { loadDemoOrder, type DemoOrder } from "@/lib/demo-order";
import { formatNaira } from "@/lib/format";
import { OrderLines } from "./OrderLines";

const longDate = (iso: string, yearsLater = 0) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(y + yearsLater, m - 1, d),
  );
};

// Read once per page load; the stored order doesn't change while this page is open.
let cached: DemoOrder | null | undefined;
const readOrder = () => (cached === undefined ? (cached = loadDemoOrder()) : cached);

/**
 * Order confirmation. DEMO: shows the order kept in this tab. When payments are live this
 * shows the status the server reports; only the verified Paystack webhook marks an order paid.
 */
export function OrderConfirmation() {
  const order = useSyncExternalStore(
    () => () => {},
    readOrder,
    () => undefined,
  );
  const [reminder, setReminder] = useState(false);

  if (order === undefined) return <p className="py-24 text-center text-ink-soft">Loading your order…</p>;

  if (!order)
    return (
      <div className="py-16 text-center">
        <h1 className="text-4xl text-oxblood">We couldn&rsquo;t find a recent order</h1>
        <p className="mt-4 text-lg text-ink-soft">If you&rsquo;ve just paid, check your email for the confirmation.</p>
        <Link href="/shop" className="mt-8 inline-block text-oxblood underline underline-offset-4">
          Back to the shop
        </Link>
      </div>
    );

  const { details } = order;
  const firstName = details.name.split(" ")[0];

  return (
    <article>
      <p className="text-sm text-ink-soft">Order {order.number}</p>
      <h1 className="mt-2 text-4xl text-oxblood md:text-5xl">Thank you, {firstName}</h1>
      <p className="mt-4 text-lg text-ink">
        We&rsquo;ve started on your order. A confirmation is on its way to <strong>{details.email}</strong>.
      </p>

      <dl className="mt-10 grid gap-x-8 gap-y-4 rounded-[1.6rem] bg-vellum p-6 shadow-card sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink-soft">Expected delivery</dt>
          <dd className="font-display text-xl">{longDate(details.deliveryDate)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Delivering to</dt>
          <dd>
            {details.forSomeoneElse ? details.recipientName : details.name}, {order.zoneName}
          </dd>
        </div>
        {details.hidePrice && (
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
            <dd className="tabular-nums">{formatNaira(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd className="text-ink-soft">{order.deliveryFee != null ? formatNaira(order.deliveryFee) : "We'll confirm the fee"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-12 rounded-[1.6rem] border border-rule p-6" aria-labelledby="remind">
        <h2 id="remind" className="text-2xl text-oxblood">
          Remind you next year?
        </h2>
        {reminder ? (
          <p className="mt-3 text-ink" role="status">
            Done. We&rsquo;ll email you a week before {longDate(details.deliveryDate, 1)}.
          </p>
        ) : (
          <>
            <p className="mt-3 text-ink-soft">We&rsquo;ll email you a week before this date next year, so it never slips by.</p>
            <button
              type="button"
              onClick={() => setReminder(true)}
              className="mt-5 h-11 rounded-full bg-oxblood px-7 text-vellum transition-colors hover:bg-wine"
            >
              Yes, remind me
            </button>
          </>
        )}
      </section>

      <Link href="/shop" className="mt-12 inline-block text-oxblood underline underline-offset-4">
        Continue shopping
      </Link>
    </article>
  );
}
