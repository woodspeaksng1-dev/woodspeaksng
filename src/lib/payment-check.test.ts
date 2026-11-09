import { describe, expect, it } from "vitest";
import type { StoredOrder } from "./orders";
import { decidePayment, type VerifiedTransaction } from "./payment-check";

const order = { number: "WS-ABCDEFGHJK", status: "pending", amountKobo: 2_159_000, currency: "NGN" } as StoredOrder;
const paid: VerifiedTransaction = {
  id: 1,
  reference: "WS-ABCDEFGHJK",
  status: "success",
  amount: 2_159_000,
  currency: "NGN",
  channel: "card",
  paidAt: "2026-11-09T12:00:00Z",
};

describe("decidePayment", () => {
  it("marks a pending order paid when the exact amount arrived", () =>
    expect(decidePayment(order, paid)).toEqual({ action: "mark-paid" }));
  it("does nothing twice for an order already paid", () =>
    expect(decidePayment({ ...order, status: "paid" }, paid).action).toBe("already-paid"));
  it.each(["failed", "abandoned", "pending", "reversed"])("treats a %s payment as not paid", (status) =>
    expect(decidePayment(order, { ...paid, status }).action).toBe("not-paid"));
  it("refuses one kobo less", () => expect(decidePayment(order, { ...paid, amount: paid.amount - 1 }).action).toBe("reject"));
  it("refuses more than the total too (we'd have to refund)", () =>
    expect(decidePayment(order, { ...paid, amount: paid.amount + 100 }).action).toBe("reject"));
  it("refuses another currency", () => expect(decidePayment(order, { ...paid, currency: "USD" }).action).toBe("reject"));
  it("refuses a payment for a different order", () =>
    expect(decidePayment(order, { ...paid, reference: "WS-ZZZZZZZZZZ" }).action).toBe("reject"));
  it("checks the amount before calling an order already paid", () =>
    expect(decidePayment({ ...order, status: "paid" }, { ...paid, amount: 1 }).action).toBe("reject"));
});
