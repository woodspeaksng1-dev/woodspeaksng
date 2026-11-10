import { z } from "zod";
import { stopWithToken } from "@/lib/server/reminders";

/*
 * POST ?order=WS-…&t=<token>: stops a yearly reminder. Used by the button on /reminders/stop and by email
 * apps' one-click unsubscribe (List-Unsubscribe-Post), so it needs no Origin: the per-reminder token is the
 * proof. Only POST, so link scanners that open emails can't stop anything by visiting.
 */

const query = z.object({ order: z.string().regex(/^WS-[A-Z0-9]{6,12}$/), t: z.string().regex(/^[a-f0-9]{48}$/) });

export async function POST(request: Request) {
  const url = new URL(request.url);
  const parsed = query.safeParse({ order: url.searchParams.get("order"), t: url.searchParams.get("t") });
  const ok = parsed.success && (await stopWithToken(parsed.data.order, parsed.data.t));
  return Response.redirect(new URL(`/reminders/stop?${ok ? "done=1" : "invalid=1"}`, url), 303);
}
