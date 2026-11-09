import { createHmac } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog";
import type { StoredOrder } from "@/lib/orders";
import type { VerifiedTransaction } from "@/lib/payment-check";

/*
 * The payment flow against the Firestore emulator (npm run test:emulator). Paystack and email are
 * stood in for; everything else is the real code: checkout route, order storage, webhook, rate limit.
 */

// The emulator settles clashing transactions with locks, which can take seconds (not so in production).
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const SECRET = "sk_test_emulator";
process.env.PAYSTACK_SECRET_KEY = SECRET;

const paystack = vi.hoisted(() => ({ verify: vi.fn(), start: vi.fn() }));
vi.mock("@/lib/server/paystack", async (original) => ({
  ...(await original<typeof import("@/lib/server/paystack")>()),
  verifyPayment: paystack.verify,
  startPayment: paystack.start,
}));
const emails = vi.hoisted(() => ({ send: vi.fn(async () => {}) }));
vi.mock("@/lib/server/order-emails", () => ({ sendPaidOrderEmails: emails.send }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));

const { db } = await import("@/lib/server/firebase");
const { confirmPayment, getOrder } = await import("@/lib/server/orders");
const checkout = await import("@/app/api/checkout/route");
const webhook = await import("@/app/api/paystack/webhook/route");

const DETAILS = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "0803 123 4567",
  marketingOptIn: false,
  forSomeoneElse: false,
  recipientName: "",
  recipientPhone: "",
  zoneId: "lekki-phase-1", // ₦6,000
  address: "12 Admiralty Way, Lekki Phase 1",
  landmark: "",
  deliveryDate: "2030-02-14",
  hidePrice: true,
};
const SCROLL = { productId: "scroll", quantity: 1, customization: { kind: "letter", text: "Happy anniversary, my love." } };

let ip = 0;
const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

async function placeOrder(lines: unknown[] = [SCROLL]): Promise<StoredOrder> {
  const res = await checkout.POST(post("http://localhost/api/checkout", { details: DETAILS, lines }));
  const body = (await res.json()) as { reference: string };
  expect(res.status, JSON.stringify(body)).toBe(200);
  const { reference } = body;
  return (await getOrder(reference))!;
}

const success = (order: StoredOrder, overrides: Partial<VerifiedTransaction> = {}): VerifiedTransaction => ({
  id: 42,
  reference: order.number,
  status: "success",
  amount: order.amountKobo,
  currency: "NGN",
  channel: "card",
  paidAt: "2026-11-09T12:00:00Z",
  ...overrides,
});

function signedWebhook(event: object, secret = SECRET) {
  const body = JSON.stringify(event);
  const signature = createHmac("sha512", secret).update(body).digest("hex");
  return post("http://localhost/api/paystack/webhook", body, { "x-paystack-signature": signature });
}

beforeAll(async () => {
  const batch = db().batch();
  SEED_CATALOG.products.forEach((p, i) => batch.set(db().doc(`products/${p.id}`), { ...p, sortOrder: i }));
  SEED_CATALOG.zones.forEach((z, i) => batch.set(db().doc(`shippingZones/${z.id}`), { ...z, sortOrder: i }));
  batch.set(db().doc("settings/shop"), { craftingDays: 3 });
  await batch.commit();
});

beforeEach(() => {
  paystack.verify.mockReset();
  paystack.start.mockReset().mockResolvedValue({ authorizationUrl: "https://checkout.paystack.com/test" });
  emails.send.mockClear();
});

describe("checkout", () => {
  it("saves a pending order priced by the server and returns Paystack's page", async () => {
    const order = await placeOrder();
    expect(order).toMatchObject({ status: "pending", itemsTotal: 15590, deliveryFee: 6000, total: 21590, amountKobo: 2_159_000 });
    expect(paystack.start).toHaveBeenCalledWith(expect.objectContaining({ amountKobo: 2_159_000, reference: order.number }));
  });

  it("ignores prices the browser sends", async () => {
    const order = await placeOrder([{ ...SCROLL, price: 1, unitPrice: 1, lineTotal: 1 }]);
    expect(order.amountKobo).toBe(2_159_000);
  });

  it("refuses bad details with field messages, and creates no order", async () => {
    const res = await checkout.POST(post("http://localhost/api/checkout", { details: { ...DETAILS, phone: "123" }, lines: [SCROLL] }));
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.phone).toMatch(/Nigerian/);
    expect(paystack.start).not.toHaveBeenCalled();
  });

  it("refuses an over-long letter", async () => {
    const lines = [{ ...SCROLL, customization: { kind: "letter", text: "word ".repeat(301) } }];
    const res = await checkout.POST(post("http://localhost/api/checkout", { details: DETAILS, lines }));
    expect(res.status).toBe(400);
  });

  it("removes the pending order if Paystack can't open a payment page", async () => {
    paystack.start.mockRejectedValue(new Error("Paystack down"));
    const before = (await db().collection("orders").where("status", "==", "pending").get()).size;
    const res = await checkout.POST(post("http://localhost/api/checkout", { details: DETAILS, lines: [SCROLL] }));
    expect(res.status).toBe(502);
    expect((await db().collection("orders").where("status", "==", "pending").get()).size).toBe(before);
  });

  it("limits each visitor to 10 attempts in 10 minutes", async () => {
    const send = () => checkout.POST(post("http://localhost/api/checkout", { details: DETAILS, lines: [] }, { "x-forwarded-for": "192.0.2.77" }));
    for (let i = 0; i < 10; i++) expect((await send()).status).toBe(400);
    expect((await send()).status).toBe(429);
  });
});

describe("confirming a payment", () => {
  it("marks the order paid once, however often it's confirmed", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValue(success(order));
    expect((await confirmPayment(order.number)).outcome).toBe("paid-now");
    expect((await confirmPayment(order.number)).outcome).toBe("already-paid");
    expect((await getOrder(order.number))!.status).toBe("paid");
    expect((await db().doc(`paystackEvents/${order.number}`).get()).exists).toBe(true);
  });

  it("lets only one of several simultaneous confirmations win", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValue(success(order));
    const outcomes = (await Promise.all(Array.from({ length: 5 }, () => confirmPayment(order.number)))).map((r) => r.outcome);
    expect(outcomes.filter((o) => o === "paid-now")).toHaveLength(1);
  });

  it("keeps the order pending and flags it when the amount is wrong", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValue(success(order, { amount: 100 }));
    expect((await confirmPayment(order.number)).outcome).toBe("rejected");
    const stored = (await getOrder(order.number))!;
    expect(stored.status).toBe("pending");
    expect(stored.paymentProblem).toMatch(/100 kobo/);
  });

  it("leaves a failed payment pending", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValue(success(order, { status: "failed" }));
    expect((await confirmPayment(order.number)).outcome).toBe("not-paid");
    expect((await getOrder(order.number))!.status).toBe("pending");
  });

  it("doesn't ask Paystack about references that aren't our orders", async () => {
    for (const ref of ["WS-NOTANORDER", "../../etc", ""]) expect((await confirmPayment(ref)).outcome).toBe("unknown-order");
    expect(paystack.verify).not.toHaveBeenCalled();
  });
});

describe("Paystack webhook", () => {
  it("refuses a forged signature", async () => {
    const order = await placeOrder();
    const res = await webhook.POST(signedWebhook({ event: "charge.success", data: { reference: order.number } }, "sk_test_attacker"));
    expect(res.status).toBe(401);
    expect(paystack.verify).not.toHaveBeenCalled();
    expect((await getOrder(order.number))!.status).toBe("pending");
  });

  it("marks the order paid and sends the emails once, even if Paystack repeats itself", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValue(success(order));
    const event = { event: "charge.success", data: { reference: order.number } };
    for (let i = 0; i < 3; i++) expect((await webhook.POST(signedWebhook(event))).status).toBe(200);
    expect((await getOrder(order.number))!.status).toBe("paid");
    expect(emails.send).toHaveBeenCalledTimes(1);
  });

  it("trusts Paystack's verification, not the amount in the webhook body", async () => {
    const order = await placeOrder();
    paystack.verify.mockResolvedValue(success(order, { amount: 500 }));
    await webhook.POST(signedWebhook({ event: "charge.success", data: { reference: order.number, amount: order.amountKobo } }));
    expect((await getOrder(order.number))!.status).toBe("pending");
    expect(emails.send).not.toHaveBeenCalled();
  });

  it("acknowledges other events without acting on them", async () => {
    const res = await webhook.POST(signedWebhook({ event: "transfer.success", data: { reference: "WS-ABCDEFGHJK" } }));
    expect(res.status).toBe(200);
    expect(paystack.verify).not.toHaveBeenCalled();
  });

  it("asks Paystack to retry if it can't confirm right now", async () => {
    const order = await placeOrder();
    paystack.verify.mockRejectedValue(new Error("network"));
    const res = await webhook.POST(signedWebhook({ event: "charge.success", data: { reference: order.number } }));
    expect(res.status).toBe(500);
  });
});
