import { z } from "zod";
import { checkoutSchema } from "@/lib/checkout";
import { priceOrder } from "@/lib/order-pricing";
import { readCatalog } from "@/lib/server/catalog";
import { createPendingOrder, discardPendingOrder } from "@/lib/server/orders";
import { startPayment } from "@/lib/server/paystack";
import { allow, clientIp } from "@/lib/server/rate-limit";
import { checkLineUploads, uploadIdsOf } from "@/lib/server/uploads";

/*
 * POST /api/checkout: { details, lines } from the checkout form.
 * Checks the details, prices the cart from the live catalog (never from the browser), saves a pending
 * order and returns a Paystack payment page for exactly that amount. Guest checkout: no sign-in needed,
 * so the abuse guard is a per-IP limit. Problems come back as 400 with messages the form shows.
 */

const MAX_BODY_BYTES = 64 * 1024; // a 300-word letter and 20 reasons fit many times over
const bodySchema = z.object({ details: z.unknown(), lines: z.unknown() });

const fail = (status: number, message: string, extra: object = {}) => Response.json({ message, ...extra }, { status });

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return fail(413, "That order is too large to send.");

  if (!(await allow("checkout", clientIp(request.headers), 10, 600)))
    return fail(429, "Too many attempts. Wait a few minutes, then try again.");

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(JSON.parse(raw));
  } catch {
    return fail(400, "Something went wrong sending your order. Refresh the page and try again.");
  }

  let catalog;
  try {
    catalog = await readCatalog();
  } catch (error) {
    console.error("Checkout: couldn't read the catalog.", error);
    return fail(503, "We couldn't reach our shop just now. Try again in a minute.");
  }

  const details = checkoutSchema(catalog).safeParse(body.details);
  if (!details.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of details.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return fail(400, "Check the details highlighted above.", { fieldErrors });
  }

  const priced = priceOrder(catalog, { lines: body.lines, zoneId: details.data.zoneId });
  if (!priced.ok) return fail(400, priced.problems[0]?.message ?? "Check your cart.", { problems: priced.problems });
  if (priced.order.deliveryFee == null)
    return fail(400, "We can't take payment for delivery to this area online yet. Message us on WhatsApp to order.");

  // Uploaded photos and videos: each must be ours, complete, and for that item.
  if (uploadIdsOf(priced.order.lines).length > 0) {
    let problem: string | null;
    try {
      problem = await checkLineUploads(priced.order.lines);
    } catch (error) {
      console.error("Checkout: couldn't check the uploaded files.", error);
      return fail(503, "We couldn't check your photos or videos just now. Try again in a minute.");
    }
    if (problem) return fail(400, problem);
  }

  const order = await createPendingOrder(details.data, priced.order);
  try {
    const { authorizationUrl } = await startPayment({
      email: order.customer.email,
      amountKobo: order.amountKobo,
      reference: order.number,
      callbackUrl: new URL("/checkout/confirmation", request.url).toString(),
      metadata: { order: order.number, items: order.lines.length },
    });
    return Response.json({ authorizationUrl, reference: order.number });
  } catch (error) {
    console.error(`Checkout: Paystack couldn't start payment for ${order.number}.`, error);
    await discardPendingOrder(order.number).catch(() => {});
    return fail(502, "We couldn't open the payment page. Try again in a minute.");
  }
}
