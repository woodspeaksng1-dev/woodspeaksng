import "server-only";
import type { StoredOrder } from "@/lib/orders";
import { alertTeam } from "./alerts";
import { db } from "./firebase";
import { sendPaidOrderEmails } from "./order-emails";
import { confirmPayment } from "./orders";

/*
 * The daily job's safety net for orders (runs from /api/cron/daily):
 * - Payments we never heard about: a buyer who paid and closed the page before returning, while
 *   Paystack's webhook also failed. Every order still pending from the last three days is checked with
 *   Paystack, and any that was paid is marked paid and emailed (the same once-only confirmPayment).
 * - Emails that didn't send at the time (Resend down): sent again, for orders paid in the last three days.
 * Queries use one field each (no composite index); the volume is a handful of orders a day.
 */

const DAY_MS = 86_400_000;
const LOOK_BACK_MS = 3 * DAY_MS;
/** Leave recent orders alone: the buyer may still be paying, or the first send may still be running. */
const SETTLE_MS = 30 * 60_000;

export interface RecoveryResult {
  checked: number;
  recovered: string[];
  emailsResent: number;
  emailsStillFailing: number;
}

export async function recoverOrders(siteUrl: string, now = new Date(), delaysMs?: readonly number[]): Promise<RecoveryResult> {
  const since = new Date(now.getTime() - LOOK_BACK_MS).toISOString();
  const settled = new Date(now.getTime() - SETTLE_MS).toISOString();
  const result: RecoveryResult = { checked: 0, recovered: [], emailsResent: 0, emailsStillFailing: 0 };

  const recent = await db().collection("orders").where("createdAt", ">=", since).get();
  for (const doc of recent.docs) {
    const order = doc.data() as StoredOrder;
    if (order.status !== "pending" || order.createdAt > settled) continue;
    result.checked++;
    try {
      const outcome = await confirmPayment(order.number);
      if (outcome.outcome === "paid-now") {
        result.recovered.push(order.number);
        await sendPaidOrderEmails(outcome.order, siteUrl, delaysMs);
      }
    } catch (error) {
      // Paystack has no record of a payment page that never opened; nothing to recover.
      console.error(`Daily job: couldn't check pending order ${order.number}.`, error);
    }
  }

  const paid = await db().collection("orders").where("paidAt", ">=", since).get();
  for (const doc of paid.docs) {
    const order = doc.data() as StoredOrder;
    if (!order.emails || (order.emails.customer && order.emails.team) || !order.paidAt || order.paidAt > settled) continue;
    if (result.recovered.includes(order.number)) continue;
    const sent = await sendPaidOrderEmails(order, siteUrl, delaysMs);
    if (sent.customer && sent.team) result.emailsResent++;
    else result.emailsStillFailing++;
  }

  if (result.recovered.length > 0)
    await alertTeam(
      "recovered-payments",
      `${result.recovered.length === 1 ? "A paid order was" : `${result.recovered.length} paid orders were`} found by the daily check`,
      `Paystack had taken payment for ${result.recovered.join(", ")}, but the site hadn't been told at the time. ` +
        `${result.recovered.length === 1 ? "It's" : "They're"} now marked paid in admin and the emails have gone out. ` +
        `Check the delivery date${result.recovered.length === 1 ? "" : "s"}: there's less time than usual.`,
    );
  return result;
}
