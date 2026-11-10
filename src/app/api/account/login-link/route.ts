import { z } from "zod";
import { sameOrigin } from "@/lib/server/auth-session";
import { escapeHtml, sendEmail } from "@/lib/server/email";
import { adminAuth } from "@/lib/server/firebase";
import { allow, clientIp } from "@/lib/server/rate-limit";

/*
 * POST { email }: emails a one-time sign-in link for the account page. Anyone can have an account, so
 * the limits are what stop abuse: per visitor and per email address.
 */

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")).pipe(z.string().max(254));

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Request refused." }, { status: 403 });
  const parsed = z.object({ email }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  const to = parsed.data.email;

  if (!(await allow("account-link-ip", clientIp(request.headers), 10, 3600)) || !(await allow("account-link-email", to, 3, 3600)))
    return Response.json({ message: "Too many links requested. Try again in an hour." }, { status: 429 });

  try {
    const link = await (await adminAuth()).generateSignInWithEmailLink(to, {
      url: new URL("/account", request.url).toString(),
      handleCodeInApp: true,
    });
    await sendEmail({
      to,
      subject: "Your Woodspeaks sign-in link",
      html:
        `<div style="font-family:Georgia,serif;color:#2a1712;max-width:480px;margin:0 auto;padding:24px">` +
        `<h1 style="font-size:22px;color:#4a1420">Sign in to Woodspeaks</h1>` +
        `<p style="font-size:16px;line-height:1.5">Tap the button to see your orders and saved addresses. The link works once, for an hour.</p>` +
        `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#4a1420;color:#f8f2e6;padding:12px 24px;border-radius:999px;text-decoration:none">Sign in</a></p>` +
        `<p style="font-size:13px;color:#6b5446">Didn't ask for this? Ignore it; nobody can sign in without this email.</p></div>`,
      text: `Sign in to Woodspeaks (works once, for an hour):\n${link}\n\nDidn't ask for this? Ignore it.`,
    });
  } catch (error) {
    console.error("Account sign-in link failed.", error);
    return Response.json({ message: "We couldn't send the link. Try Google, or try again shortly." }, { status: 502 });
  }
  return Response.json({ message: "Check your email for a sign-in link. It works for an hour." });
}
