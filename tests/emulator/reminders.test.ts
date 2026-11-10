import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredOrder } from "@/lib/orders";

/*
 * Yearly reminders against the Firestore emulator (npm run test:emulator): setting one from an order, the
 * daily job, the stop link, the account page and the cron route's lock. Stood in for: the email sender,
 * the signed-in customer, and the visitor's headers.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type Mail = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };
const mail = vi.hoisted(() => ({ send: vi.fn<(m: Mail) => Promise<void>>(async () => {}) }));
vi.mock("@/lib/server/email", async (original) => ({ ...(await original<typeof import("@/lib/server/email")>()), sendEmail: mail.send }));
const session = vi.hoisted(() => ({ person: null as null | { uid: string; email: string; name: string | null } }));
vi.mock("@/lib/server/customer-session", () => ({ currentCustomer: async () => session.person }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "10.4.0.1" }) }));

const { db } = await import("@/lib/server/firebase");
const reminders = await import("@/lib/server/reminders");
const confirmActions = await import("@/app/(site)/checkout/confirmation/actions");
const accountActions = await import("@/app/(site)/account/actions");
const stopRoute = await import("@/app/api/reminders/stop/route");
const cronRoute = await import("@/app/api/cron/daily/route");

const SITE = "https://woodspeaks.test";

function order(number: string, status: StoredOrder["status"], date: string, email = "kemi@example.com"): StoredOrder {
  return {
    number,
    status,
    createdAt: `${date}T09:00:00Z`,
    paidAt: status === "pending" ? null : `${date}T09:00:00Z`,
    customer: { name: "Kemi Adeyemi", email, phone: "08031112222", marketingOptIn: false },
    recipient: { name: "Tunde <B>", phone: "08039998888" },
    delivery: { zoneId: "yaba", zoneName: "Yaba", address: "1 Test Road", landmark: "", date, hidePrice: false },
    lines: [{ productId: "rose", name: "Real Rose", unitPrice: 10000, quantity: 1, lineTotal: 10000, customization: { kind: "none" } }],
    itemsTotal: 10000,
    deliveryFee: 5000,
    total: 15000,
    amountKobo: 1_500_000,
    currency: "NGN",
    nfc: null,
    paystack: null,
    paymentProblem: null,
  };
}

beforeAll(async () => {
  const batch = db().batch();
  batch.set(db().doc("orders/WS-REMIND0001"), order("WS-REMIND0001", "paid", "2026-02-14"));
  batch.set(db().doc("orders/WS-REMIND0002"), order("WS-REMIND0002", "pending", "2026-02-14"));
  batch.set(db().doc("orders/WS-REMIND0003"), order("WS-REMIND0003", "delivered", "2026-03-01", "other@example.com"));
  await batch.commit();
});

beforeEach(async () => {
  mail.send.mockReset();
  mail.send.mockImplementation(async () => {});
  session.person = null;
  const snap = await db().collection("reminders").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
});

describe("setting a reminder", () => {
  it("from a paid order, for that order's buyer, a week before the date next year", async () => {
    const r = await confirmActions.remindNextYear("WS-REMIND0001");
    expect(r).toMatchObject({ ok: true });
    const saved = await reminders.getReminder("WS-REMIND0001");
    expect(saved).toMatchObject({ email: "kemi@example.com", deliverTo: "Tunde <B>", occasion: "2026-02-14" });
    expect(saved!.nextOccasion).toMatch(/^\d{4}-02-14$/);
    expect(saved!.nextSendOn).toBe(`${saved!.nextOccasion!.slice(0, 4)}-02-07`);
    expect(saved!.stopToken).toMatch(/^[a-f0-9]{48}$/);
  });

  it("not for unpaid or unknown orders, or nonsense", async () => {
    expect((await confirmActions.remindNextYear("WS-REMIND0002")).ok).toBe(false);
    expect((await confirmActions.remindNextYear("WS-NOSUCH0001")).ok).toBe(false);
    expect((await confirmActions.remindNextYear("../orders/x")).ok).toBe(false);
    expect((await db().collection("reminders").get()).size).toBe(0);
  });

  it("asking twice keeps one reminder and its stop link", async () => {
    await confirmActions.remindNextYear("WS-REMIND0001");
    const token = (await reminders.getReminder("WS-REMIND0001"))!.stopToken;
    expect((await confirmActions.remindNextYear("WS-REMIND0001")).message).toMatch(/already set/);
    expect((await reminders.getReminder("WS-REMIND0001"))!.stopToken).toBe(token);
  });
});

describe("the daily job", () => {
  it("sends what's due, escaped, with a one-click stop, then moves it to the next year", async () => {
    await reminders.remindForOrder("WS-REMIND0001", "2026-02-20");
    expect((await reminders.sendDueReminders("2027-02-06", SITE)).sent).toBe(0);
    expect(await reminders.sendDueReminders("2027-02-07", SITE)).toEqual({ sent: 1, skipped: 0, failed: 0 });
    const email = mail.send.mock.calls[0][0];
    expect(email.to).toBe("kemi@example.com");
    expect(email.html).toContain("Tunde &lt;B&gt;");
    expect(email.html).not.toContain("<B>");
    expect(email.headers?.["List-Unsubscribe"]).toMatch(/^<https:\/\/woodspeaks\.test\/api\/reminders\/stop\?order=WS-REMIND0001&t=[a-f0-9]{48}>$/);
    const after = await reminders.getReminder("WS-REMIND0001");
    expect(after).toMatchObject({ nextOccasion: "2028-02-14", nextSendOn: "2028-02-07", claimedUntil: null });
    // Running again the same day sends nothing more.
    expect((await reminders.sendDueReminders("2027-02-07", SITE)).sent).toBe(0);
  });

  it("keeps a failed send due for the next day", async () => {
    await reminders.remindForOrder("WS-REMIND0001", "2026-02-20");
    mail.send.mockRejectedValueOnce(new Error("Resend down"));
    expect((await reminders.sendDueReminders("2027-02-07", SITE)).failed).toBe(1);
    expect(await reminders.getReminder("WS-REMIND0001")).toMatchObject({ nextSendOn: "2027-02-07", claimedUntil: null });
    expect((await reminders.sendDueReminders("2027-02-08", SITE)).sent).toBe(1);
  });

  it("doesn't send late: if the date has gone by, it waits for next year", async () => {
    await reminders.remindForOrder("WS-REMIND0001", "2026-02-20");
    expect(await reminders.sendDueReminders("2027-02-15", SITE)).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(mail.send).not.toHaveBeenCalled();
    expect((await reminders.getReminder("WS-REMIND0001"))!.nextOccasion).toBe("2028-02-14");
  });
});

describe("stopping", () => {
  const stop = (order: string, t: string) => stopRoute.POST(new Request(`${SITE}/api/reminders/stop?order=${order}&t=${t}`, { method: "POST" }));

  it("works with the email's link, and only with the right token", async () => {
    await reminders.remindForOrder("WS-REMIND0001", "2026-02-20");
    const { stopToken } = (await reminders.getReminder("WS-REMIND0001"))!;
    const wrong = await stop("WS-REMIND0001", "0".repeat(48));
    expect(wrong.headers.get("location")).toMatch(/invalid=1/);
    expect(reminders.isActive((await reminders.getReminder("WS-REMIND0001"))!)).toBe(true);
    const right = await stop("WS-REMIND0001", stopToken);
    expect(right.status).toBe(303);
    expect(right.headers.get("location")).toMatch(/done=1/);
    expect(reminders.isActive((await reminders.getReminder("WS-REMIND0001"))!)).toBe(false);
    expect((await reminders.sendDueReminders("2027-02-07", SITE)).sent).toBe(0);
  });

  it("from the account page, only your own", async () => {
    await reminders.remindForOrder("WS-REMIND0003", "2026-03-05");
    session.person = { uid: "k1", email: "kemi@example.com", name: null };
    expect((await accountActions.stopReminder("WS-REMIND0003")).ok).toBe(false);
    session.person = { uid: "o1", email: "other@example.com", name: null };
    expect((await reminders.listCustomerReminders("other@example.com")).map((r) => r.orderNumber)).toEqual(["WS-REMIND0003"]);
    expect((await accountActions.stopReminder("WS-REMIND0003")).ok).toBe(true);
    expect(await reminders.listCustomerReminders("other@example.com")).toEqual([]);
  });

  it("can be set again later from the order", async () => {
    await reminders.remindForOrder("WS-REMIND0001", "2026-02-20");
    const { stopToken } = (await reminders.getReminder("WS-REMIND0001"))!;
    await reminders.stopWithToken("WS-REMIND0001", stopToken);
    expect((await confirmActions.remindNextYear("WS-REMIND0001")).ok).toBe(true);
    expect(reminders.isActive((await reminders.getReminder("WS-REMIND0001"))!)).toBe(true);
  });
});

describe("the cron route", () => {
  it("refuses calls without Vercel's secret", async () => {
    process.env.CRON_SECRET = "s".repeat(32);
    const call = (auth?: string) => cronRoute.GET(new Request(`${SITE}/api/cron/daily`, { headers: auth ? { authorization: auth } : {} }));
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect((await call(`Bearer ${"s".repeat(32)}`)).status).toBe(200);
    delete process.env.CRON_SECRET;
    expect((await call(`Bearer ${"s".repeat(32)}`)).status).toBe(401);
  });
});
