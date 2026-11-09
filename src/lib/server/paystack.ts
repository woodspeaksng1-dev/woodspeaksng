import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { VerifiedTransaction } from "@/lib/payment-check";

/*
 * Paystack, server side only, with the secret key from the environment (test keys outside production).
 * - startPayment(): asks Paystack for a payment page for an exact amount in kobo.
 * - verifyPayment(): asks Paystack what really happened to a reference. We never trust the webhook body
 *   or the redirect alone; every "paid" is checked here first.
 * - isGenuineWebhook(): HMAC SHA512 of the raw request body with the secret key, compared in constant time.
 */

const API = "https://api.paystack.co";
const TIMEOUT_MS = 15_000;

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set.");
  return key;
}

export function isGenuineWebhook(rawBody: string, signature: string | null, key: string = secretKey()): boolean {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac("sha512", key).update(rawBody, "utf8").digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: unknown } | null;
  if (!res.ok || !body?.status) throw new Error(`Paystack ${path}: ${res.status} ${body?.message ?? "no response"}`);
  return body.data;
}

export async function startPayment(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string | number>;
}): Promise<{ authorizationUrl: string }> {
  const data = await call("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
  const { authorization_url } = z.object({ authorization_url: z.url() }).parse(data);
  return { authorizationUrl: authorization_url };
}

const verifySchema = z.object({
  id: z.number(),
  reference: z.string(),
  status: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  channel: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
});

export async function verifyPayment(reference: string): Promise<VerifiedTransaction> {
  const data = verifySchema.parse(await call(`/transaction/verify/${encodeURIComponent(reference)}`));
  return {
    id: data.id,
    reference: data.reference,
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    channel: data.channel ?? null,
    paidAt: data.paid_at ?? null,
  };
}
