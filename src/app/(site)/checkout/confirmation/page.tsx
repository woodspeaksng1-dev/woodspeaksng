import type { Metadata } from "next";
import Link from "next/link";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { OrderConfirmation } from "@/components/checkout/OrderConfirmation";
import { CONTACT } from "@/lib/contact";
import { summarise } from "@/lib/orders";
import { sendPaidOrderEmails } from "@/lib/server/order-emails";
import { confirmPayment, type ConfirmOutcome } from "@/lib/server/orders";
import { getReminder } from "@/lib/server/reminders";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

/*
 * Paystack sends the buyer here after paying (?reference=WS-…). The page checks the payment with
 * Paystack itself (the same idempotent check as the webhook), so the order shows as paid even if the
 * webhook hasn't arrived yet; whichever gets there first sends the emails.
 */
export default function ConfirmationPage({ searchParams }: PageProps<"/checkout/confirmation">) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-28 sm:px-6">
      <Suspense fallback={<p className="py-24 text-center text-ink-soft">Checking your payment…</p>}>
        <Confirmation searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-4xl text-oxblood">{title}</h1>
      <div className="mx-auto mt-4 max-w-md text-lg text-ink-soft">{children}</div>
    </div>
  );
}

const whatsapp = (reference: string) => (
  <a href={CONTACT.whatsappUrl(`Hello Woodspeaks, I need help with order ${reference}.`)} className="text-oxblood underline underline-offset-4" rel="noopener">
    message us on WhatsApp
  </a>
);

async function Confirmation({ searchParams }: Pick<PageProps<"/checkout/confirmation">, "searchParams">) {
  await connection(); // checks a live payment: only ever at request time, never prerendered
  const params = await searchParams;
  const reference = typeof params.reference === "string" ? params.reference : "";

  let result: ConfirmOutcome | null;
  try {
    result = await confirmPayment(reference);
  } catch (error) {
    console.error(`Confirmation: couldn't check ${reference}.`, error);
    result = null;
  }

  if (!result)
    return (
      <Notice title="We're checking your payment">
        <p>This is taking longer than usual. Refresh this page in a minute. If you&rsquo;ve paid, your confirmation email is on its way.</p>
      </Notice>
    );

  if (result.outcome === "unknown-order")
    return (
      <Notice title="We couldn't find that order">
        <p>If you&rsquo;ve just paid, check your email for the confirmation.</p>
        <Link href="/shop" className="mt-8 inline-block text-oxblood underline underline-offset-4">
          Back to the shop
        </Link>
      </Notice>
    );

  if (result.outcome === "not-paid")
    return (
      <Notice title="Your payment didn't go through">
        <p>No money was taken. Your cart is still saved, so you can try again.</p>
        <Link href="/checkout" className="mt-8 inline-flex h-12 items-center rounded-full bg-oxblood px-8 text-vellum transition-colors hover:bg-wine">
          Try again
        </Link>
      </Notice>
    );

  if (result.outcome === "rejected")
    return (
      <Notice title="We need to check your payment">
        <p>
          Something about this payment didn&rsquo;t match your order ({result.order.number}), so we&rsquo;re looking into it. Please{" "}
          {whatsapp(result.order.number)} and we&rsquo;ll sort it out.
        </p>
      </Notice>
    );

  if (result.outcome === "paid-now") {
    const order = result.order;
    after(() => sendPaidOrderEmails(order, SITE.url));
  }
  const reminder = await getReminder(result.order.number).catch(() => null);
  return <OrderConfirmation summary={summarise(result.order)} reminderFor={reminder?.nextOccasion ?? null} />;
}
