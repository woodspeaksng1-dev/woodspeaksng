import { z } from "zod";
import { adminAuth } from "@/lib/server/firebase";
import { escapeHtml, sendEmail } from "@/lib/server/email";
import { allow, clientIp } from "@/lib/server/rate-limit";
import { getStaffMember, sameOrigin, staffEmail } from "@/lib/server/staff";

/*
 * POST /api/admin/login-link { email }: emails a one-time sign-in link, but only to people on the team.
 * The reply is the same either way, so it can't be used to find out who works at Woodspeaks.
 * We send it ourselves through Resend (Firebase's own sender allows only 5 a day on the free plan).
 */

const SAME_REPLY = { message: "If that email is on the team, a sign-in link is on its way. It works for an hour." };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Request refused." }, { status: 403 });
  const parsed = z.object({ email: staffEmail }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  const { email } = parsed.data;

  const ip = clientIp(request.headers);
  if (!(await allow("admin-link-ip", ip, 10, 3600)) || !(await allow("admin-link-email", email, 3, 3600)))
    return Response.json({ message: "Too many links requested. Try again in an hour." }, { status: 429 });

  if (await getStaffMember(email)) {
    const link = await (await adminAuth()).generateSignInWithEmailLink(email, {
      url: new URL("/admin/login", request.url).toString(),
      handleCodeInApp: true,
    });
    await sendEmail({
      to: email,
      subject: "Your Woodspeaks admin sign-in link",
      html:
        `<div style="font-family:Georgia,serif;color:#2a1712;max-width:480px;margin:0 auto;padding:24px">` +
        `<h1 style="font-size:22px;color:#4a1420">Sign in to Woodspeaks admin</h1>` +
        `<p style="font-size:16px;line-height:1.5">Tap the button to sign in. The link works once, for an hour, on this device's browser.</p>` +
        `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#4a1420;color:#f8f2e6;padding:12px 24px;border-radius:999px;text-decoration:none">Sign in</a></p>` +
        `<p style="font-size:13px;color:#6b5446">Didn't ask for this? Ignore it; nobody can sign in without this email.</p></div>`,
      text: `Sign in to Woodspeaks admin (works once, for an hour):\n${link}\n\nDidn't ask for this? Ignore it.`,
    }).catch((error) => console.error("Admin sign-in link: email failed.", error));
  }
  return Response.json(SAME_REPLY);
}
