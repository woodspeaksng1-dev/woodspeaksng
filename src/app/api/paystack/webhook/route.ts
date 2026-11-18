import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { alertTeam } from "@/lib/server/alerts";
import { CATALOG_TAG } from "@/lib/server/catalog";
import { sendPaidOrderEmails } from "@/lib/server/order-emails";
import { confirmPayment, isOrderNumber } from "@/lib/server/orders";
import { isGenuineWebhook } from "@/lib/server/paystack";
import { SITE } from "@/lib/site";

/*
 * POST /api/paystack/webhook: Paystack's server telling us about a payment.
 * 1. The signature (HMAC SHA512 of the raw body with our secret key) must match, or we refuse.
 * 2. We don't trust the body's amount: confirmPayment() asks Paystack to verify the reference and checks
 *    the exact amount and currency against the order before marking it paid, once only.
 * 3. We reply 200 quickly; emails go out after the response. A 500 makes Paystack retry later.
 */

const eventSchema = z.object({ event: z.string(), data: z.object({ reference: z.string().optional() }).loose() }).loose();

export async function POST(request: Request) {
  const raw = await request.text();
  if (!isGenuineWebhook(raw, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new Response("Not JSON", { status: 400 });
  }
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success || parsed.data.event !== "charge.success") return new Response("Ignored", { status: 200 });

  const reference = parsed.data.data.reference ?? "";
  if (!isOrderNumber(reference)) return new Response("Not one of our orders", { status: 200 });

  try {
    const result = await confirmPayment(reference);
    if (result.outcome === "paid-now") {
      after(() => sendPaidOrderEmails(result.order, SITE.url));
    }
    // A payment takes units off stock: refresh the shop so counts and "sold out" are current. Also when the
    // confirmation page marked it paid first, since a page can't refresh the cache itself.
    if (result.outcome === "paid-now" || result.outcome === "already-paid") revalidateTag(CATALOG_TAG, { expire: 0 });
    return Response.json({ outcome: result.outcome });
  } catch (error) {
    console.error(`Webhook: couldn't confirm ${reference}; Paystack will retry.`, error);
    after(() =>
      alertTeam(
        "webhook",
        "a payment couldn't be confirmed yet",
        `Order ${reference}: ${String(error)}\nPaystack retries on its own, and the daily check catches any it misses.`,
      ),
    );
    return new Response("Try again", { status: 500 });
  }
}
