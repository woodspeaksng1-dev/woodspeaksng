import { z } from "zod";
import { sameOrigin } from "@/lib/server/auth-session";
import { CUSTOMER_SESSION_DAYS, customerCookieHeader, startCustomerSession } from "@/lib/server/customers";
import { allow, clientIp } from "@/lib/server/rate-limit";

/* POST { idToken }: start a customer session after Google or an email link. DELETE: sign out. */

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Request refused." }, { status: 403 });
  if (!(await allow("account-session", clientIp(request.headers), 20, 600)))
    return Response.json({ message: "Too many attempts. Wait a few minutes, then try again." }, { status: 429 });
  const body = z.object({ idToken: z.string().min(20).max(4096) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ message: "That sign-in didn't work. Try again." }, { status: 400 });

  const result = await startCustomerSession(body.data.idToken);
  if (!result.ok) return Response.json({ message: result.message }, { status: result.status });
  return Response.json(
    { email: result.person.email },
    { headers: { "Set-Cookie": customerCookieHeader(result.cookie, CUSTOMER_SESSION_DAYS * 24 * 60 * 60) } },
  );
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Request refused." }, { status: 403 });
  return new Response(null, { status: 204, headers: { "Set-Cookie": customerCookieHeader("", 0) } });
}
