import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { renderBroadcast, type BroadcastContent, type BroadcastRow, type BroadcastStatus } from "@/lib/broadcast";
import type { StoredOrder } from "@/lib/orders";
import { logActivity } from "./admin-activity";
import { sendEmail } from "./email";
import { db } from "./firebase";
import type { SignedInStaff } from "./staff";

/*
 * Emails to customers who agreed to updates.
 * - Who: everyone whose latest paid order ticked "Send me updates", unless they unsubscribed after that order.
 *   Unsubscribes live in `mailingPrefs/{email}` with a random token for the link (no email in the URL).
 * - Staff write a draft in `broadcasts/{id}` and send a test to themselves. Only the owner can send to
 *   everyone, and only the exact content that was tested.
 * - Sending: the recipients are written to `broadcasts/{id}/recipients/{email}`, then sent in throttled
 *   batches, at most BROADCAST_DAILY_LIMIT a day (counted in `emailQuota/{date}`), so a big list never uses
 *   up the email plan's allowance that order emails need. What's left goes out on the next daily run.
 */

export type BroadcastResult = { ok: boolean; message: string };

/** Broadcast emails per day. Resend's free plan allows 100 a day in all; this leaves room for order emails. */
export const dailyLimit = () => {
  const n = Number(process.env.BROADCAST_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 70;
};

interface StoredBroadcast extends BroadcastContent {
  id: string;
  status: BroadcastStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  testedHash: string | null;
  testedBy: string | null;
  queuedAt: string | null;
  queuedBy: string | null;
  siteUrl: string | null;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  finishedAt: string | null;
  claimedUntil: string | null;
}

interface Recipient {
  email: string;
  token: string;
  status: "pending" | "sent" | "failed" | "skipped";
  at: string | null;
}

const broadcasts = () => db().collection("broadcasts");
const prefs = () => db().collection("mailingPrefs");

const contentOf = (b: BroadcastContent): BroadcastContent => ({
  subject: b.subject,
  heading: b.heading,
  body: b.body,
  buttonLabel: b.buttonLabel,
  buttonUrl: b.buttonUrl,
});
const hashOf = (c: BroadcastContent) => createHash("sha256").update(JSON.stringify(contentOf(c))).digest("hex");

export const unsubscribeLinks = (siteUrl: string, token: string) => ({
  page: `${siteUrl}/emails/unsubscribe?t=${token}`,
  oneClick: `${siteUrl}/api/emails/unsubscribe?t=${token}`,
});

/** The unsubscribe token for an address, made the first time it's needed. */
async function tokenFor(email: string): Promise<string> {
  const ref = prefs().doc(email);
  return db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    const existing = snap.get("token") as string | undefined;
    if (existing) return existing;
    const token = randomBytes(24).toString("hex");
    t.set(ref, { email, token, unsubscribedAt: null }, { merge: true });
    return token;
  });
}

/** From the link in an email. True if the token was real (already unsubscribed counts). */
export async function unsubscribe(token: string): Promise<boolean> {
  const snap = await prefs().where("token", "==", token).limit(1).get();
  if (snap.empty) return false;
  await snap.docs[0].ref.update({ unsubscribedAt: new Date().toISOString() });
  return true;
}

/** Everyone who should get a broadcast now. */
export async function audience(): Promise<{ email: string; name: string }[]> {
  const [orderSnap, prefSnap] = await Promise.all([
    db().collection("orders").orderBy("createdAt", "desc").limit(5000).get(),
    prefs().where("unsubscribedAt", "!=", null).get(),
  ]);
  const unsubscribedAt = new Map(prefSnap.docs.map((d) => [d.id, d.get("unsubscribedAt") as string]));
  const latest = new Map<string, StoredOrder>();
  for (const d of orderSnap.docs) {
    const o = d.data() as StoredOrder;
    if (o.status === "pending" || o.status === "cancelled") continue;
    const email = o.customer.email.toLowerCase();
    if (!latest.has(email)) latest.set(email, o);
  }
  return [...latest.entries()]
    .filter(([email, o]) => {
      if (!o.customer.marketingOptIn) return false;
      const out = unsubscribedAt.get(email);
      // Ticking the box again on a later order signs them back up.
      return !out || out < (o.paidAt ?? o.createdAt);
    })
    .map(([email, o]) => ({ email, name: o.customer.name }));
}

const toRow = (b: StoredBroadcast): BroadcastRow => ({
  ...contentOf(b),
  id: b.id,
  status: b.status,
  createdAt: b.createdAt,
  createdBy: b.createdBy,
  tested: b.testedHash === hashOf(b),
  testedBy: b.testedBy,
  queuedAt: b.queuedAt,
  total: b.total,
  sent: b.sent,
  failed: b.failed,
  skipped: b.skipped,
  finishedAt: b.finishedAt,
});

export async function listBroadcasts(): Promise<BroadcastRow[]> {
  const snap = await broadcasts().orderBy("createdAt", "desc").limit(100).get();
  return snap.docs.map((d) => toRow(d.data() as StoredBroadcast));
}

/** Creates a draft (no id) or saves changes to one. Sent ones can't change. Editing undoes the test. */
export async function saveDraft(staff: SignedInStaff, id: string | null, content: BroadcastContent): Promise<BroadcastResult & { id?: string }> {
  const now = new Date().toISOString();
  if (!id) {
    const newId = randomUUID();
    const draft: StoredBroadcast = {
      ...contentOf(content),
      id: newId,
      status: "draft",
      createdAt: now,
      createdBy: staff.email,
      updatedAt: now,
      testedHash: null,
      testedBy: null,
      queuedAt: null,
      queuedBy: null,
      siteUrl: null,
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      finishedAt: null,
      claimedUntil: null,
    };
    await broadcasts().doc(newId).create(draft);
    await logActivity(staff.email, "Started email draft", content.subject);
    return { ok: true, message: "Draft saved.", id: newId };
  }
  const ref = broadcasts().doc(id);
  const outcome = await db().runTransaction(async (t) => {
    const b = (await t.get(ref)).data() as StoredBroadcast | undefined;
    if (!b) return "missing";
    if (b.status !== "draft") return "locked";
    t.update(ref, { ...contentOf(content), updatedAt: now });
    return "ok";
  });
  if (outcome === "missing") return { ok: false, message: "That draft doesn't exist." };
  if (outcome === "locked") return { ok: false, message: "This email has already been sent, so it can't change." };
  return { ok: true, message: "Draft saved.", id };
}

export async function deleteDraft(staff: SignedInStaff, id: string): Promise<BroadcastResult> {
  const ref = broadcasts().doc(id);
  const subject = await db().runTransaction(async (t) => {
    const b = (await t.get(ref)).data() as StoredBroadcast | undefined;
    if (!b || b.status !== "draft") return null;
    t.delete(ref);
    return b.subject;
  });
  if (subject === null) return { ok: false, message: "Only drafts can be deleted." };
  await logActivity(staff.email, "Deleted email draft", subject);
  return { ok: true, message: "Draft deleted." };
}

/** Sends the draft, as it is now, to the member of staff, and records that this exact content was tested. */
export async function sendTest(staff: SignedInStaff, id: string, siteUrl: string, send = sendEmail): Promise<BroadcastResult> {
  const ref = broadcasts().doc(id);
  const b = (await ref.get()).data() as StoredBroadcast | undefined;
  if (!b || b.status !== "draft") return { ok: false, message: "Only drafts can be tested." };
  const links = unsubscribeLinks(siteUrl, await tokenFor(staff.email));
  const email = renderBroadcast(b, { siteUrl, unsubscribeUrl: links.page });
  try {
    await send({ to: staff.email, ...email, subject: `[Test] ${email.subject}` });
  } catch (error) {
    console.error("Test email failed.", error);
    return { ok: false, message: "The test didn't send. Try again in a moment." };
  }
  await ref.update({ testedHash: hashOf(b), testedBy: staff.email });
  return { ok: true, message: `Test sent to ${staff.email}. Check it on your phone, then send it to everyone.` };
}

/** The owner sends a tested draft to everyone on the list. It goes out in daily batches from here. */
export async function queueBroadcast(staff: SignedInStaff, id: string, siteUrl: string): Promise<BroadcastResult> {
  if (staff.role !== "owner") return { ok: false, message: "Only the owner can send to customers. Ask them to send it." };
  const ref = broadcasts().doc(id);
  const b = (await ref.get()).data() as StoredBroadcast | undefined;
  if (!b || b.status !== "draft") return { ok: false, message: "That email has already been sent." };
  if (b.testedHash !== hashOf(b)) return { ok: false, message: "Send yourself a test of this version first." };

  const people = await audience();
  if (people.length === 0) return { ok: false, message: "Nobody has agreed to updates yet, so there's no one to send to." };

  // Claim it first, so a double click can't queue it twice.
  const claimed = await db().runTransaction(async (t) => {
    const now = (await t.get(ref)).data() as StoredBroadcast;
    if (now.status !== "draft") return false;
    t.update(ref, { status: "sending", queuedAt: new Date().toISOString(), queuedBy: staff.email, siteUrl, total: people.length });
    return true;
  });
  if (!claimed) return { ok: false, message: "That email has already been sent." };

  for (let i = 0; i < people.length; i += 400) {
    const batch = db().batch();
    for (const p of people.slice(i, i + 400)) {
      const recipient: Recipient = { email: p.email, token: await tokenFor(p.email), status: "pending", at: null };
      batch.set(ref.collection("recipients").doc(p.email), recipient);
    }
    await batch.commit();
  }
  await logActivity(staff.email, `Sent email to ${people.length} customers`, b.subject);
  const perDay = dailyLimit();
  return {
    ok: true,
    message:
      people.length <= perDay
        ? `Sending to ${people.length} ${people.length === 1 ? "person" : "people"} now.`
        : `Sending to ${people.length} people: ${perDay} a day, so it finishes in about ${Math.ceil(people.length / perDay)} days.`,
  };
}

/** Takes one email from today's allowance; false when it's used up. */
async function takeFromQuota(today: string, limit: number): Promise<boolean> {
  const ref = db().collection("emailQuota").doc(today);
  return db().runTransaction(async (t) => {
    const count = ((await t.get(ref)).get("count") as number | undefined) ?? 0;
    if (count >= limit) return false;
    t.set(ref, { count: count + 1, date: today }, { merge: true });
    return true;
  });
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends what's waiting, within today's allowance and a time budget. Runs right after the owner presses
 * send, and from the daily job. Two runs can't work on the same email at once (claimedUntil).
 */
export async function runBroadcasts(opts: {
  today: string;
  deadline: number;
  send?: typeof sendEmail;
  /** Resend allows a few requests a second; stay under it. */
  gapMs?: number;
}): Promise<{ sent: number; failed: number; skipped: number; waiting: number }> {
  const send = opts.send ?? sendEmail;
  const gap = opts.gapMs ?? 600;
  const limit = dailyLimit();
  const totals = { sent: 0, failed: 0, skipped: 0, waiting: 0 };
  const sending = await broadcasts().where("status", "==", "sending").get();

  for (const doc of sending.docs.sort((a, b) => String(a.get("queuedAt")).localeCompare(String(b.get("queuedAt"))))) {
    const ref = doc.ref;
    const now = Date.now();
    const b = await db().runTransaction(async (t) => {
      const cur = (await t.get(ref)).data() as StoredBroadcast;
      if (cur.status !== "sending" || (cur.claimedUntil && cur.claimedUntil > new Date(now).toISOString())) return null;
      t.update(ref, { claimedUntil: new Date(now + 5 * 60_000).toISOString() });
      return cur;
    });
    if (!b) continue;

    const counts = { sent: 0, failed: 0, skipped: 0 };
    let outOfTime = false;
    try {
      const pending = await ref.collection("recipients").where("status", "==", "pending").limit(limit).get();
      for (const r of pending.docs) {
        if (Date.now() > opts.deadline) {
          outOfTime = true;
          break;
        }
        const recipient = r.data() as Recipient;
        // Unsubscribed since it was queued: skip.
        const out = (await prefs().doc(recipient.email).get()).get("unsubscribedAt") as string | null | undefined;
        if (out && b.queuedAt && out > b.queuedAt) {
          await r.ref.update({ status: "skipped", at: new Date().toISOString() });
          counts.skipped++;
          continue;
        }
        if (!(await takeFromQuota(opts.today, limit))) break;
        const links = unsubscribeLinks(b.siteUrl ?? "", recipient.token);
        try {
          await send({
            to: recipient.email,
            ...renderBroadcast(b, { siteUrl: b.siteUrl ?? "", unsubscribeUrl: links.page }),
            headers: { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          });
          await r.ref.update({ status: "sent", at: new Date().toISOString() });
          counts.sent++;
        } catch (error) {
          console.error(`Broadcast ${b.id} to one recipient failed.`, error);
          await r.ref.update({ status: "failed", at: new Date().toISOString() });
          counts.failed++;
        }
        if (gap) await pause(gap);
      }
    } finally {
      const left = (await ref.collection("recipients").where("status", "==", "pending").count().get()).data().count;
      await db().runTransaction(async (t) => {
        const cur = (await t.get(ref)).data() as StoredBroadcast;
        t.update(ref, {
          sent: cur.sent + counts.sent,
          failed: cur.failed + counts.failed,
          skipped: cur.skipped + counts.skipped,
          claimedUntil: null,
          ...(left === 0 ? { status: "sent", finishedAt: new Date().toISOString() } : {}),
        });
      });
      totals.sent += counts.sent;
      totals.failed += counts.failed;
      totals.skipped += counts.skipped;
      totals.waiting += left;
    }
    if (outOfTime) break;
  }
  return totals;
}
