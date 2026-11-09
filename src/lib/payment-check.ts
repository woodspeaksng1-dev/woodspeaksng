import type { StoredOrder } from "./orders";

/*
 * Whether a payment Paystack reports may mark an order paid. Pure, so it's tested on its own; the
 * server runs it inside a Firestore transaction with the order it just read.
 */

/** The parts of Paystack's verify response we rely on. */
export interface VerifiedTransaction {
  id: number;
  reference: string;
  status: string;
  /** In kobo. */
  amount: number;
  currency: string;
  channel: string | null;
  paidAt: string | null;
}

export type PaymentDecision =
  | { action: "mark-paid" }
  | { action: "already-paid" }
  | { action: "not-paid"; reason: string }
  | { action: "reject"; reason: string };

export function decidePayment(order: StoredOrder, tx: VerifiedTransaction): PaymentDecision {
  if (tx.reference !== order.number) return { action: "reject", reason: `Paystack reference ${tx.reference} doesn't match order ${order.number}.` };
  if (tx.status !== "success") return { action: "not-paid", reason: `Paystack says the payment is "${tx.status}".` };
  if (tx.currency !== order.currency)
    return { action: "reject", reason: `Paid in ${tx.currency}, but the order is in ${order.currency}.` };
  if (tx.amount !== order.amountKobo)
    return { action: "reject", reason: `Paid ${tx.amount} kobo, but the order total is ${order.amountKobo} kobo.` };
  // Paid already (a repeated webhook, or the buyer refreshing the confirmation page): nothing to do twice.
  if (order.status !== "pending") return { action: "already-paid" };
  return { action: "mark-paid" };
}
