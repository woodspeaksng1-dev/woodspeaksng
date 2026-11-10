import { z } from "zod";
import { allow, clientIp } from "@/lib/server/rate-limit";
import { SESSION_DAYS, sameOrigin, sessionCookieHeader, startSession } from "@/lib/server/staff";

/*
 * POST /api/admin/session { idToken }: after Google or an email link proves who someone is, start an admin
 * session if they're on the team. DELETE: sign out (clears the cookie).
 */

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Request refused." }, { status: 403 });
  if (!(await allow("admin-session", clientIp(request.headers), 20, 600)))
    return Response.json({ message: "Too many attempts. Wait a few minutes, then try again." }, { status: 429 });

  const body = z.object({ idToken: z.string().min(20).max(4096) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ message: "That sign-in didn't work. Try again." }, { status: 400 });

  const result = await startSession(body.data.idToken);
  if (!result.ok) return Response.json({ message: result.message }, { status: result.status });
  return Response.json(
    { email: result.staff.email, role: result.staff.role },
    { headers: { "Set-Cookie": sessionCookieHeader(result.cookie, SESSION_DAYS * 24 * 60 * 60) } },
  );
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Request refused." }, { status: 403 });
  return new Response(null, { status: 204, headers: { "Set-Cookie": sessionCookieHeader("", 0) } });
}
