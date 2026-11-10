import { after } from "next/server";
import { enquiryRequestSchema } from "@/lib/enquiry";
import { sameOrigin } from "@/lib/server/auth-session";
import { saveEnquiry, sendEnquiryEmail } from "@/lib/server/enquiries";
import { allow, clientIp } from "@/lib/server/rate-limit";

/*
 * POST { kind: "contact" | "corporate", ...fields }: saves the enquiry for admin and emails the team.
 * Anyone can send one, so: our pages only, a honeypot field, and a per-visitor limit.
 */

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Request refused." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  // A filled honeypot means a bot: reply as if it worked and keep nothing.
  if (body && typeof body.website === "string" && body.website !== "") return Response.json({ message: "Thank you." });

  const parsed = enquiryRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the form and try again." }, { status: 400 });

  if (!(await allow("enquiry-ip", clientIp(request.headers), 5, 3600)))
    return Response.json({ message: "You've sent several messages already. Try again in an hour, or message us on WhatsApp." }, { status: 429 });

  try {
    const enquiry = await saveEnquiry(parsed.data);
    const adminUrl = new URL("/admin/enquiries", request.url).toString();
    after(() => sendEnquiryEmail(enquiry, adminUrl));
  } catch (error) {
    console.error("Saving an enquiry failed.", error);
    return Response.json({ message: "We couldn't send that. Try again, or message us on WhatsApp." }, { status: 502 });
  }
  return Response.json({ message: "Thank you." });
}
