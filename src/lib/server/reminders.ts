import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { StoredOrder } from "@/lib/orders";
import { dueAction, nextOccasionAfter, sendDateFor, type ReminderRow } from "@/lib/reminders";
import { escapeHtml as e, sendEmail } from "./email";
import { db } from "./firebase";

/*
 * Yearly gift reminders, kept in Firestore `reminders/{orderNumber}` (one per order). Created only from a
 * paid order, for that order's buyer: the browser names the order, never the email address. A daily job
 * (/api/cron/reminders) sends the ones due. Each email has a stop link carrying a random per-reminder token.
 * A stopped reminder has nextSendOn null, so the daily query never sees it.
 */

export interface StoredReminder extends ReminderRow {
  email: string;
  firstName: string;
  occasion: string;
  stopToken: string;
  createdAt: string;
  stoppedAt: string | null;
  /** Set while a send is in progress, so two overlapping runs can't both send it. */
  claimedUntil: string | null;
}

const reminders = () => db().collection("reminders");

const itemsOf = (order: StoredOrder) => order.lines.map((l) => l.name).join(", ");

export const isActive = (r: Pick<StoredReminder, "nextSendOn">) => r.nextSendOn !== null;

/** Sets (or restarts) the yearly reminder for a paid order. */
export async function remindForOrder(orderNumber: string, today: string): Promise<{ ok: boolean; message: string; nextOccasion?: string }> {
  return db().runTransaction(async (t) => {
    const orderSnap = await t.get(db().collection("orders").doc(orderNumber));
    const order = orderSnap.data() as StoredOrder | undefined;
    if (!order || order.status === "pending" || order.status === "cancelled") return { ok: false, message: "We couldn't find that order." };
    const ref = reminders().doc(orderNumber);
    const existing = (await t.get(ref)).data() as StoredReminder | undefined;
    if (existing && isActive(existing)) return { ok: true, message: "Your reminder is already set.", nextOccasion: existing.nextOccasion ?? undefined };
    const occasion = order.delivery.date;
    const nextOccasion = nextOccasionAfter(occasion, occasion, today);
    const reminder: StoredReminder = {
      orderNumber,
      email: order.customer.email.toLowerCase(),
      firstName: order.customer.name.split(" ")[0],
      deliverTo: order.recipient?.name ?? order.customer.name,
      items: itemsOf(order),
      occasion,
      nextOccasion,
      nextSendOn: sendDateFor(nextOccasion),
      lastSentAt: existing?.lastSentAt ?? null,
      stopToken: existing?.stopToken ?? randomBytes(24).toString("hex"),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      stoppedAt: null,
      claimedUntil: null,
    };
    t.set(ref, reminder);
    return { ok: true, message: "Reminder set.", nextOccasion };
  });
}

export async function getReminder(orderNumber: string): Promise<StoredReminder | null> {
  const snap = await reminders().doc(orderNumber).get();
  return snap.exists ? (snap.data() as StoredReminder) : null;
}

async function stop(orderNumber: string, allowed: (r: StoredReminder) => boolean): Promise<boolean> {
  return db().runTransaction(async (t) => {
    const ref = reminders().doc(orderNumber);
    const r = (await t.get(ref)).data() as StoredReminder | undefined;
    if (!r || !allowed(r)) return false;
    if (isActive(r)) t.update(ref, { nextSendOn: null, nextOccasion: null, stoppedAt: new Date().toISOString() });
    return true;
  });
}

const sameToken = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** From the stop link in an email: needs that reminder's token. */
export const stopWithToken = (orderNumber: string, token: string) => stop(orderNumber, (r) => sameToken(r.stopToken, token));

/** From the account page: only the buyer's own reminders. */
export const stopForCustomer = (orderNumber: string, email: string) => stop(orderNumber, (r) => r.email === email.toLowerCase());

export async function listCustomerReminders(email: string): Promise<ReminderRow[]> {
  const snap = await reminders().where("email", "==", email.toLowerCase()).limit(50).get();
  return snap.docs
    .map((d) => d.data() as StoredReminder)
    .filter(isActive)
    .sort((a, b) => (a.nextSendOn ?? "").localeCompare(b.nextSendOn ?? ""))
    .map(toRow);
}

const toRow = (r: StoredReminder): ReminderRow => ({
  orderNumber: r.orderNumber,
  deliverTo: r.deliverTo,
  items: r.items,
  nextOccasion: r.nextOccasion,
  nextSendOn: r.nextSendOn,
  lastSentAt: r.lastSentAt,
});

export interface AdminReminderRow extends ReminderRow {
  firstName: string;
  email: string;
}

/** Active reminders, soonest first (stopped ones have no send date, so they're not in this query). */
export async function listUpcomingReminders(limit = 300): Promise<AdminReminderRow[]> {
  const snap = await reminders().orderBy("nextSendOn").limit(limit).get();
  return snap.docs.map((d) => {
    const r = d.data() as StoredReminder;
    return { ...toRow(r), firstName: r.firstName, email: r.email };
  });
}

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
};

export function reminderEmail(r: StoredReminder, siteUrl: string) {
  const stopUrl = `${siteUrl}/reminders/stop?order=${encodeURIComponent(r.orderNumber)}&t=${r.stopToken}`;
  const oneClick = `${siteUrl}/api/reminders/stop?order=${encodeURIComponent(r.orderNumber)}&t=${r.stopToken}`;
  const when = longDate(r.nextOccasion ?? r.occasion);
  const forWhom = r.deliverTo.split(" ")[0] === r.firstName ? "" : ` for ${r.deliverTo}`;
  return {
    to: r.email,
    subject: `${when} is a week away`,
    headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    html:
      `<div style="font-family:Georgia,'Times New Roman',serif;color:#2a1712;background:#eee2cb;padding:24px">` +
      `<div style="max-width:520px;margin:0 auto;background:#f8f2e6;border-radius:16px;padding:28px">` +
      `<h1 style="font-size:24px;color:#4a1420;margin:0 0 16px">Hello ${e(r.firstName)}, it's nearly that day again</h1>` +
      `<p style="font-size:16px;line-height:1.5">Last time, you sent ${e(r.items)}${e(forWhom)} for <strong>${e(when)}</strong>. ` +
      `That date is a week away. If you'd like to mark it again, there's still time for us to make something by hand.</p>` +
      `<p><a href="${e(siteUrl)}/shop" style="display:inline-block;background:#4a1420;color:#f8f2e6;padding:12px 24px;border-radius:999px;text-decoration:none">Find a gift</a></p>` +
      `<p style="font-size:13px;color:#6b5446;margin-top:24px">You asked us to remind you each year. ` +
      `<a href="${e(stopUrl)}" style="color:#6b5446">Stop these reminders</a>.</p></div></div>`,
    text:
      `Hello ${r.firstName}, it's nearly that day again.\n\nLast time, you sent ${r.items}${forWhom} for ${when}. ` +
      `That date is a week away. If you'd like to mark it again: ${siteUrl}/shop\n\nStop these reminders: ${stopUrl}`,
  };
}

/**
 * The daily job: sends every reminder due on or before `today`, then moves it to next year. A reminder whose
 * date has already gone by (the job was down) is moved on without sending. A failed send stays due and is
 * tried again the next day.
 */
export async function sendDueReminders(today: string, siteUrl: string, send = sendEmail): Promise<{ sent: number; skipped: number; failed: number }> {
  const due = await reminders().where("nextSendOn", "<=", today).orderBy("nextSendOn").limit(200).get();
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const doc of due.docs) {
    const ref = doc.ref;
    const now = new Date();
    const claimed = await db().runTransaction(async (t) => {
      const r = (await t.get(ref)).data() as StoredReminder | undefined;
      if (!r || !r.nextSendOn || !r.nextOccasion || r.nextSendOn > today) return null;
      if (r.claimedUntil && r.claimedUntil > now.toISOString()) return null;
      if (dueAction(r.nextOccasion, today) === "skip") {
        const next = nextOccasionAfter(r.occasion, r.nextOccasion, today);
        t.update(ref, { nextOccasion: next, nextSendOn: sendDateFor(next) });
        return "skip" as const;
      }
      t.update(ref, { claimedUntil: new Date(now.getTime() + 10 * 60_000).toISOString() });
      return r;
    });
    if (claimed === null) continue;
    if (claimed === "skip") {
      skipped++;
      continue;
    }
    try {
      await send(reminderEmail(claimed, siteUrl));
      const next = nextOccasionAfter(claimed.occasion, claimed.nextOccasion!, today);
      const lastSentAt = new Date().toISOString();
      // If the buyer stopped it while it was sending, it stays stopped.
      await db().runTransaction(async (t) => {
        const r = (await t.get(ref)).data() as StoredReminder;
        t.update(ref, r.nextSendOn === null ? { lastSentAt, claimedUntil: null } : { nextOccasion: next, nextSendOn: sendDateFor(next), lastSentAt, claimedUntil: null });
      });
      sent++;
    } catch (error) {
      console.error(`Reminder for ${claimed.orderNumber} failed.`, error);
      await ref.update({ claimedUntil: null }).catch(() => {});
      failed++;
    }
  }
  return { sent, skipped, failed };
}
