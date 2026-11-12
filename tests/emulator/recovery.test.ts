import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog";
import type { StoredOrder } from "@/lib/orders";
import type { VerifiedTransaction } from "@/lib/payment-check";

/*
 * The safety net against the Firestore emulator: order emails retried and recorded, the daily check that
 * finds payments we never heard about and resends emails that didn't go, and team alerts (one per kind an
 * hour). Stood in for: Paystack and the email sender.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
process.env.ORDER_NOTIFICATION_EMAIL = "team@example.com";

const paystack = vi.hoisted(() => ({ verify: vi.fn(), start: vi.fn() }));
vi.mock("@/lib/server/paystack", async (original) => ({
  ...(await original<typeof import("@/lib/server/paystack")>()),
  verifyPayment: paystack.verify,
  startPayment: paystack.start,
}));
const mail = vi.hoisted(() => ({ send: vi.fn(async (_m: { to: string; subject: string }) => {}) }));
vi.mock("@/lib/server/email", async (original) => ({
  ...(await original<typeof import("@/lib/server/email")>()),
  sendEmail: mail.send,
}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));

const { db } = await import("@/lib/server/firebase");
const { confirmPayment, getOrder } = await import("@/lib/server/orders");
const { sendPaidOrderEmails } = await import("@/lib/server/order-emails");
const { recoverOrders } = await import("@/lib/server/order-recovery");
const { alertTeam } = await import("@/lib/server/alerts");
const checkout = await import("@/app/api/checkout/route");

const SITE = "https://www.woodspeaks.ng";
const NO_WAIT = [0, 0, 0];
const DETAILS = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "0803 123 4567",
  marketingOptIn: false,
  forSomeoneElse: false,
  recipientName: "",
  recipientPhone: "",
  zoneId: "lekki-phase-1",
  address: "12 Admiralty Way, Lekki Phase 1",
  landmark: "",
  deliveryDate: "2030-02-14",
  hidePrice: false,
};
const SCROLL = { productId: "scroll", quantity: 1, customization: { kind: "letter", text: "Happy anniversary, my love." } };

let ip = 0;
async function placeOrder(): Promise<StoredOrder> {
  const res = await checkout.POST(
    new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.2.0.${++ip}` },
      body: JSON.stringify({ details: DETAILS, lines: [SCROLL] }),
    }),
  );
  const body = (await res.json()) as { reference: string; message?: string };
  expect(res.status, body.message).toBe(200);
  return (await getOrder(body.reference))!;
}

const paidTx = (order: StoredOrder, overrides: Partial<VerifiedTransaction> = {}): VerifiedTransaction => ({
  id: 9,
  reference: order.number,
  status: "success",
  amount: order.amountKobo,
  currency: "NGN",
  channel: "card",
  paidAt: "2026-11-12T10:00:00Z",
  ...overrides,
});

const alerts = () => mail.send.mock.calls.map(([m]) => m).filter((m) => m.subject.startsWith("Woodspeaks site:"));
const later = (minutes: number) => new Date(Date.now() + minutes * 60_000);

beforeAll(async () => {
  const batch = db().batch();
  SEED_CATALOG.products.forEach((p, i) => batch.set(db().doc(`products/${p.id}`), { ...p, sortOrder: i }));
  SEED_CATALOG.zones.forEach((z, i) => batch.set(db().doc(`shippingZones/${z.id}`), { ...z, sortOrder: i }));
  batch.set(db().doc("settings/shop"), { craftingDays: 3 });
  await batch.commit();
});

beforeEach(async () => {
  paystack.verify.mockReset();
  paystack.start.mockReset().mockResolvedValue({ authorizationUrl: "https://checkout.paystack.com/test" });
  mail.send.mockReset().mockResolvedValue(undefined);
  // Each test starts with no alerts sent this hour, and only its own orders.
  const docs = [...(await db().collection("rateLimits").get()).docs, ...(await db().collection("orders").get()).docs];
  await Promise.all(docs.map((d) => d.ref.delete()));
});

describe("order emails", () => {
  it("records both emails as sent", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValueOnce(paidTx(order));
    const paid = await confirmPayment(order.number);
    expect((await getOrder(order.number))!.emails).toEqual({ customer: false, team: false });

    expect(await sendPaidOrderEmails(paid.order!, SITE, NO_WAIT)).toEqual({ customer: true, team: true });
    expect((await getOrder(order.number))!.emails).toEqual({ customer: true, team: true });
    expect(mail.send).toHaveBeenCalledTimes(2);
  });

  it("tries again after a hiccup, and alerts the team when an email won't go", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValueOnce(paidTx(order));
    const paid = (await confirmPayment(order.number)).order!;

    // The buyer's email fails every time; the team's fails once, then goes.
    let teamTries = 0;
    mail.send.mockImplementation(async (m) => {
      if (m.to === DETAILS.email) throw new Error("Resend is down");
      if (m.subject.startsWith("New order") && ++teamTries === 1) throw new Error("hiccup");
    });
    expect(await sendPaidOrderEmails(paid, SITE, NO_WAIT)).toEqual({ customer: false, team: true });
    expect(teamTries).toBe(2);
    expect((await getOrder(order.number))!.emails).toEqual({ customer: false, team: true });
    expect(alerts().map((a) => a.subject)).toEqual([`Woodspeaks site: Order ${order.number}: an email didn't send`]);
  });
});

describe("the daily check", () => {
  it("finds a payment we never heard about, marks it paid and sends the emails", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValueOnce(paidTx(order));

    const result = await recoverOrders(SITE, later(45), NO_WAIT);
    expect(result).toMatchObject({ checked: 1, recovered: [order.number] });
    const stored = (await getOrder(order.number))!;
    expect(stored.status).toBe("paid");
    expect(stored.emails).toEqual({ customer: true, team: true });
    expect(alerts().some((a) => a.subject.includes("found by the daily check"))).toBe(true);
  });

  it("leaves orders alone while the buyer may still be paying, and unpaid ones unpaid", async () => {
    const fresh = await placeOrder();
    expect((await recoverOrders(SITE, later(5), NO_WAIT)).checked).toBe(0);

    paystack.verify.mockResolvedValueOnce(paidTx(fresh, { status: "abandoned" }));
    expect(await recoverOrders(SITE, later(45), NO_WAIT)).toMatchObject({ checked: 1, recovered: [] });
    expect((await getOrder(fresh.number))!.status).toBe("pending");
  });

  it("carries on when Paystack has no record of an order", async () => {
    const lost = await placeOrder();
    const found = await placeOrder();
    paystack.verify.mockImplementation(async (ref: string) => {
      if (ref === lost.number) throw new Error("Transaction reference not found");
      return paidTx(found);
    });
    expect(await recoverOrders(SITE, later(45), NO_WAIT)).toMatchObject({ checked: 2, recovered: [found.number] });
  });

  it("resends only the email that didn't go, and ignores orders from before emails were recorded", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValueOnce(paidTx(order));
    await confirmPayment(order.number);
    await db().doc(`orders/${order.number}`).update({ "emails.team": true });

    const old = await placeOrder();
    paystack.verify.mockResolvedValueOnce(paidTx(old));
    await confirmPayment(old.number);
    await db().doc(`orders/${old.number}`).update({ emails: null });

    const result = await recoverOrders(SITE, later(45), NO_WAIT);
    expect(result).toMatchObject({ emailsResent: 1, emailsStillFailing: 0 });
    expect(mail.send.mock.calls.map(([m]) => m.to)).toEqual([DETAILS.email]);
    expect((await getOrder(order.number))!.emails).toEqual({ customer: true, team: true });
  });
});

describe("alerts", () => {
  it("tells the team once when a payment doesn't match its order", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValue(paidTx(order, { amount: 100 }));
    expect((await confirmPayment(order.number)).outcome).toBe("rejected");
    expect((await confirmPayment(order.number)).outcome).toBe("rejected");
    expect(alerts().map((a) => a.subject)).toEqual([`Woodspeaks site: Order ${order.number}: a payment doesn't match`]);
  });

  it("sends at most one of a kind an hour, and never throws", async () => {
    expect(await alertTeam("test-kind", "first", "details")).toBe(true);
    expect(await alertTeam("test-kind", "second", "details")).toBe(false);
    expect(await alertTeam("other-kind", "third", "details")).toBe(true);
    mail.send.mockRejectedValueOnce(new Error("down"));
    expect(await alertTeam("third-kind", "fourth", "details")).toBe(false);
  });

  it("tells the team when Paystack won't open a payment page", async () => {
    paystack.start.mockRejectedValue(new Error("Paystack 401 Invalid key"));
    const res = await checkout.POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `10.2.1.${++ip}` },
        body: JSON.stringify({ details: DETAILS, lines: [SCROLL] }),
      }),
    );
    expect(res.status).toBe(502);
    await vi.waitFor(() => expect(alerts().map((a) => a.subject)).toEqual(["Woodspeaks site: Paystack wouldn't open a payment page"]));
  });
});
