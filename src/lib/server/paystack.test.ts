import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isGenuineWebhook } from "./paystack";

const KEY = "sk_test_unit";
const body = JSON.stringify({ event: "charge.success", data: { reference: "WS-ABCDEFGHJK", amount: 100 } });
const sign = (text: string, key = KEY) => createHmac("sha512", key).update(text).digest("hex");

describe("isGenuineWebhook", () => {
  it("accepts Paystack's signature of the exact body", () => expect(isGenuineWebhook(body, sign(body), KEY)).toBe(true));
  it("refuses a missing signature", () => expect(isGenuineWebhook(body, null, KEY)).toBe(false));
  it("refuses a body changed after signing", () =>
    expect(isGenuineWebhook(body.replace('"amount":100', '"amount":1'), sign(body), KEY)).toBe(false));
  it("refuses a signature made with another key", () => expect(isGenuineWebhook(body, sign(body, "sk_test_other"), KEY)).toBe(false));
  it("refuses junk and truncated signatures", () => {
    for (const s of ["", "abc", sign(body).slice(0, 64), "z".repeat(128)]) expect(isGenuineWebhook(body, s, KEY)).toBe(false);
  });
});
