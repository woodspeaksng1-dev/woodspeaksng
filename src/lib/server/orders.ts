import "server-only";
import { randomInt } from "node:crypto";
import type { CheckoutDetails } from "@/lib/checkout";
import { toKobo, type PricedOrder } from "@/lib/order-pricing";
import type { StoredOrder } from "@/lib/orders";
import { decidePayment, type VerifiedTransaction } from "@/lib/payment-check";
import { db } from "./firebase";
import { verifyPayment } from "./paystack";
import { uploadIdsOf } from "./uploads";

/*
 * Orders in Firestore. Created "pending" when the buyer starts paying; marked "paid" only by
 * confirmPayment(), after Paystack confirms the exact amount. The webhook and the confirmation page
 * both call it; a transaction makes sure only one of them marks the order paid (and sends the emails).
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I to misread
const NUMBER_PATTERN = /^WS-[A-HJ-NP-Z2-9]{10}$/;

/** Random order number, also the Paystack reference: ~50 bits, so links to it can't be guessed. */
export function newOrderNumber(): string {
  return `WS-${Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;
}

export const isOrderNumber = (value: string) => NUMBER_PATTERN.test(value);

const orders = () => db().collection("orders");

export async function createPendingOrder(details: CheckoutDetails, priced: PricedOrder): Promise<StoredOrder> {
  if (priced.deliveryFee == null) throw new Error("Can't take payment without a delivery fee.");
  const base: Omit<StoredOrder, "number"> = {
    status: "pending",
    createdAt: new Date().toISOString(),
    paidAt: null,
    customer: { name: details.name, email: details.email, phone: details.phone, marketingOptIn: details.marketingOptIn },
    recipient: details.forSomeoneElse ? { name: details.recipientName, phone: details.recipientPhone } : null,
    delivery: {
      zoneId: priced.zone.id,
      zoneName: priced.zone.name,
      address: details.address,
      landmark: details.landmark,
      date: details.deliveryDate,
      hidePrice: details.hidePrice,
    },
    lines: priced.lines,
    itemsTotal: priced.itemsTotal,
    deliveryFee: priced.deliveryFee,
    total: priced.total,
    amountKobo: toKobo(priced.total),
    currency: "NGN",
    nfc: priced.lines.some((l) => l.customization.kind === "video") ? { status: "to-write" } : null,
    paystack: null,
    paymentProblem: null,
  };
  // create() refuses to overwrite, so a (vanishingly unlikely) clash just picks another number.
  for (let attempt = 0; attempt < 3; attempt++) {
    const order: StoredOrder = { ...base, number: newOrderNumber() };
    try {
      await orders().doc(order.number).create(order);
      return order;
    } catch (error) {
      if ((error as { code?: number }).code !== 6) throw error; // 6 = ALREADY_EXISTS
    }
  }
  throw new Error("Couldn't pick a free order number.");
}

/** Removes a pending order that never reached Paystack (the payment page couldn't be created). */
export async function discardPendingOrder(number: string) {
  await db().runTransaction(async (t) => {
    const ref = orders().doc(number);
    const snap = await t.get(ref);
    if (snap.exists && snap.get("status") === "pending") t.delete(ref);
  });
}

export async function getOrder(number: string): Promise<StoredOrder | null> {
  if (!isOrderNumber(number)) return null;
  const snap = await orders().doc(number).get();
  return snap.exists ? (snap.data() as StoredOrder) : null;
}

export type ConfirmOutcome =
  | { outcome: "paid-now"; order: StoredOrder }
  | { outcome: "already-paid"; order: StoredOrder }
  | { outcome: "not-paid"; order: StoredOrder; reason: string }
  | { outcome: "rejected"; order: StoredOrder; reason: string }
  | { outcome: "unknown-order"; order: null };

/**
 * Checks a reference with Paystack and, if the exact amount was paid, marks the order paid. Safe to call
 * any number of times, from anywhere: only the first successful call returns "paid-now".
 */
export async function confirmPayment(
  reference: string,
  verify: (reference: string) => Promise<VerifiedTransaction> = verifyPayment,
): Promise<ConfirmOutcome> {
  const existing = await getOrder(reference);
  if (!existing) return { outcome: "unknown-order", order: null };
  if (existing.status !== "pending") return { outcome: "already-paid", order: existing };

  const tx = await verify(reference);

  return db().runTransaction<ConfirmOutcome>(async (t) => {
    const ref = orders().doc(reference);
    const snap = await t.get(ref);
    if (!snap.exists) return { outcome: "unknown-order", order: null };
    const order = snap.data() as StoredOrder;
    const decision = decidePayment(order, tx);

    if (decision.action === "already-paid") return { outcome: "already-paid", order };
    if (decision.action === "not-paid") return { outcome: "not-paid", order, reason: decision.reason };
    if (decision.action === "reject") {
      console.error(`Order ${reference}: payment refused. ${decision.reason}`);
      if (order.paymentProblem !== decision.reason) t.update(ref, { paymentProblem: decision.reason });
      return { outcome: "rejected", order: { ...order, paymentProblem: decision.reason }, reason: decision.reason };
    }

    const paid: StoredOrder = {
      ...order,
      status: "paid",
      paidAt: new Date().toISOString(),
      paystack: { transactionId: tx.id, channel: tx.channel, paidAt: tx.paidAt },
    };
    t.update(ref, { status: paid.status, paidAt: paid.paidAt, paystack: paid.paystack });
    // One record per reference; create() fails if it exists, a second guard against fulfilling twice.
    t.create(db().collection("paystackEvents").doc(reference), {
      reference,
      transactionId: tx.id,
      amountKobo: tx.amount,
      recordedAt: paid.paidAt,
    });
    // Link the buyer's files to this order, so the weekly clean-up keeps them.
    for (const id of uploadIdsOf(order.lines)) t.set(db().collection("uploads").doc(id), { orderNumber: reference }, { merge: true });
    t.create(db().collection("auditLog").doc(), {
      at: paid.paidAt,
      by: "Paystack",
      action: "payment received",
      target: `${reference} (${paid.total.toLocaleString("en-NG")} naira)`,
    });
    return { outcome: "paid-now", order: paid };
  });
}
