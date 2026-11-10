import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredOrder } from "@/lib/orders";

/*
 * Customer update emails against the Firestore emulator (npm run test:emulator): who's on the list, drafts,
 * test-before-send, owner-only sending, the daily limit, overlapping runs and unsubscribing.
 * Stood in for: the email sender, who is signed in, and the request's host.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type Mail = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };
const mail = vi.hoisted(() => ({ send: vi.fn<(m: Mail) => Promise<void>>(async () => {}) }));
vi.mock("@/lib/server/email", async (original) => ({ ...(await original<typeof import("@/lib/server/email")>()), sendEmail: mail.send }));
const session = vi.hoisted(() => ({ staff: null as null | { uid: string; email: string; role: "owner" | "staff"; name: string | null } }));
vi.mock("@/lib/server/admin-session", () => ({ currentStaff: async () => session.staff, requireStaff: async () => session.staff }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "woodspeaks.test", "x-forwarded-proto": "https" }) }));
const later = vi.hoisted(() => ({ jobs: [] as (() => unknown)[] }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void later.jobs.push(fn) }));

const { db } = await import("@/lib/server/firebase");
const broadcasts = await import("@/lib/server/broadcasts");
const actions = await import("@/app/admin/(panel)/emails/actions");
const unsubscribeRoute = await import("@/app/api/emails/unsubscribe/route");

const OWNER = { uid: "o1", email: "owner@woodspeaks.test", role: "owner" as const, name: "Owner" };
const STAFF = { uid: "s1", email: "tolu@woodspeaks.test", role: "staff" as const, name: "Tolu" };
const DRAFT = { subject: "Valentine's orders close on the 7th", heading: "Love <3", body: "Order early.\n\nWe deliver across Lagos.", buttonLabel: "Shop", buttonUrl: "/shop" };

let n = 0;
async function order(email: string, optIn: boolean, at: string, status: StoredOrder["status"] = "paid") {
  const number = `WS-BCAST${String(++n).padStart(5, "0")}`;
  await db()
    .doc(`orders/${number}`)
    .set({
      number,
      status,
      createdAt: at,
      paidAt: status === "pending" ? null : at,
      customer: { name: "Bisi Ola", email, phone: "08031112222", marketingOptIn: optIn },
      recipient: null,
      delivery: { zoneId: "yaba", zoneName: "Yaba", address: "1 Test Road", landmark: "", date: "2030-02-14", hidePrice: false },
      lines: [],
      itemsTotal: 0,
      deliveryFee: 0,
      total: 0,
      amountKobo: 0,
      currency: "NGN",
      nfc: null,
      paystack: null,
      paymentProblem: null,
    } satisfies StoredOrder);
}

const ours = (list: { email: string }[]) => list.map((p) => p.email).filter((e) => e.endsWith("@bc.test")).sort();

async function newTestedDraft() {
  session.staff = STAFF;
  const saved = await actions.saveEmailDraft(null, DRAFT);
  await actions.sendTestEmail(saved.id!);
  session.staff = OWNER;
  return saved.id!;
}

beforeEach(async () => {
  mail.send.mockReset();
  mail.send.mockImplementation(async () => {});
  later.jobs = [];
  session.staff = STAFF;
  process.env.BROADCAST_DAILY_LIMIT = "3";
  // Only this file's people (and nobody else who opted in) are on the list.
  const optedIn = await db().collection("orders").where("customer.marketingOptIn", "==", true).get();
  await Promise.all(optedIn.docs.map((d) => d.ref.delete()));
  for (const name of ["broadcasts", "mailingPrefs", "emailQuota"]) await db().recursiveDelete(db().collection(name));
  await order("a@bc.test", true, "2026-10-01T10:00:00Z");
  await order("b@bc.test", true, "2026-10-02T10:00:00Z");
  await order("c@bc.test", true, "2026-10-03T10:00:00Z");
  await order("d@bc.test", true, "2026-10-04T10:00:00Z");
  await order("e@bc.test", true, "2026-10-05T10:00:00Z");
});

describe("who gets them", () => {
  it("people whose latest paid order ticked the box", async () => {
    await order("f@bc.test", true, "2026-10-01T10:00:00Z");
    await order("f@bc.test", false, "2026-10-09T10:00:00Z"); // changed their mind
    await order("g@bc.test", true, "2026-10-01T10:00:00Z", "pending"); // never paid
    expect(ours(await broadcasts.audience())).toEqual(["a@bc.test", "b@bc.test", "c@bc.test", "d@bc.test", "e@bc.test"]);
  });

  it("not after they unsubscribe, unless they tick the box again on a later order", async () => {
    const id = await newTestedDraft();
    const token = mail.send.mock.calls[0][0].html.match(/unsubscribe\?t=([a-f0-9]{48})/)![1];
    void id;
    const bad = await unsubscribeRoute.POST(new Request(`https://woodspeaks.test/api/emails/unsubscribe?t=${"0".repeat(48)}`, { method: "POST" }));
    expect(bad.headers.get("location")).toMatch(/invalid=1/);
    // The test went to staff; make staff a customer to check the list.
    await order(STAFF.email, true, "2026-10-06T10:00:00Z");
    expect((await broadcasts.audience()).some((p) => p.email === STAFF.email)).toBe(true);
    const ok = await unsubscribeRoute.POST(new Request(`https://woodspeaks.test/api/emails/unsubscribe?t=${token}`, { method: "POST" }));
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toMatch(/done=1/);
    expect((await broadcasts.audience()).some((p) => p.email === STAFF.email)).toBe(false);
    await order(STAFF.email, true, new Date(Date.now() + 60_000).toISOString());
    expect((await broadcasts.audience()).some((p) => p.email === STAFF.email)).toBe(true);
  });
});

describe("drafts and tests", () => {
  it("a test goes only to the person testing, escaped, with an unsubscribe link", async () => {
    const saved = await actions.saveEmailDraft(null, DRAFT);
    expect(saved.ok).toBe(true);
    expect((await actions.sendTestEmail(saved.id!)).ok).toBe(true);
    expect(mail.send).toHaveBeenCalledTimes(1);
    const m = mail.send.mock.calls[0][0];
    expect(m.to).toBe(STAFF.email);
    expect(m.subject).toBe(`[Test] ${DRAFT.subject}`);
    expect(m.html).toContain("Love &lt;3");
    expect(m.html).toContain('href="https://woodspeaks.test/shop"');
    expect(m.html).toMatch(/https:\/\/woodspeaks\.test\/emails\/unsubscribe\?t=[a-f0-9]{48}/);
  });

  it("refuses bad content, and signed-out calls", async () => {
    expect((await actions.saveEmailDraft(null, { ...DRAFT, buttonUrl: "javascript:alert(1)" })).ok).toBe(false);
    expect((await actions.saveEmailDraft(null, { ...DRAFT, subject: "" })).ok).toBe(false);
    session.staff = null;
    expect((await actions.saveEmailDraft(null, DRAFT)).message).toMatch(/Sign in/);
    expect((await db().collection("broadcasts").get()).size).toBe(0);
  });

  it("only the owner sends to everyone, only the tested version, and only once", async () => {
    const { id } = await actions.saveEmailDraft(null, DRAFT);
    expect((await actions.sendToEveryone(id!)).message).toMatch(/Only the owner/);
    session.staff = OWNER;
    expect((await actions.sendToEveryone(id!)).message).toMatch(/test/);
    await actions.sendTestEmail(id!);
    await actions.saveEmailDraft(id!, { ...DRAFT, subject: "Changed after the test" });
    expect((await actions.sendToEveryone(id!)).message).toMatch(/test of this version/);
    await actions.sendTestEmail(id!);
    expect((await actions.sendToEveryone(id!)).ok).toBe(true);
    expect((await actions.sendToEveryone(id!)).ok).toBe(false);
    expect((await actions.saveEmailDraft(id!, DRAFT)).message).toMatch(/already been sent/);
    expect((await actions.deleteEmailDraft(id!)).ok).toBe(false);
    const recipients = await db().collection(`broadcasts/${id}/recipients`).get();
    expect(ours(recipients.docs.map((d) => d.data() as { email: string }))).toHaveLength(5);
  });
});

describe("sending", () => {
  it("sends no more than the daily limit, finishes on later days, and never twice", async () => {
    const id = await newTestedDraft();
    mail.send.mockClear();
    await actions.sendToEveryone(id);
    await Promise.all(later.jobs.map((j) => j())); // the run that starts straight away
    expect(mail.send).toHaveBeenCalledTimes(3);
    const first = mail.send.mock.calls[0][0];
    expect(first.headers?.["List-Unsubscribe"]).toMatch(/^<https:\/\/woodspeaks\.test\/api\/emails\/unsubscribe\?t=[a-f0-9]{48}>$/);
    expect((await broadcasts.runBroadcasts({ today: (await quotaDay()) ?? "", deadline: Date.now() + 30_000, gapMs: 0 })).sent).toBe(0);
    // Next day: two runs at once still send each person only once.
    const [r1, r2] = await Promise.all([
      broadcasts.runBroadcasts({ today: "2099-01-01", deadline: Date.now() + 30_000, gapMs: 0 }),
      broadcasts.runBroadcasts({ today: "2099-01-01", deadline: Date.now() + 30_000, gapMs: 0 }),
    ]);
    expect(r1.sent + r2.sent).toBe(2);
    const to = mail.send.mock.calls.map((c) => c[0].to);
    expect(new Set(to).size).toBe(to.length);
    const b = (await db().doc(`broadcasts/${id}`).get()).data()!;
    expect(b).toMatchObject({ status: "sent", sent: 5, total: 5, claimedUntil: null });
  });

  it("skips anyone who unsubscribes while it's still going out, and keeps going after a failure", async () => {
    const id = await newTestedDraft();
    mail.send.mockReset();
    mail.send.mockRejectedValueOnce(new Error("Resend down"));
    await actions.sendToEveryone(id);
    const pending = await db().collection(`broadcasts/${id}/recipients`).where("status", "==", "pending").get();
    const last = pending.docs.at(-1)!.data() as { token: string };
    await broadcasts.unsubscribe(last.token);
    process.env.BROADCAST_DAILY_LIMIT = "50";
    const r = await broadcasts.runBroadcasts({ today: "2099-02-01", deadline: Date.now() + 30_000, gapMs: 0 });
    expect(r).toMatchObject({ sent: 3, failed: 1, skipped: 1, waiting: 0 });
    expect((await db().doc(`broadcasts/${id}`).get()).data()).toMatchObject({ status: "sent", sent: 3, failed: 1, skipped: 1 });
  });
});

async function quotaDay() {
  const snap = await db().collection("emailQuota").get();
  return snap.docs[0]?.id;
}
