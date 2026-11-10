import { z } from "zod";
import { unsubscribe } from "@/lib/server/broadcasts";

/*
 * POST ?t=<token>: unsubscribes from customer emails. Used by the button on /emails/unsubscribe and by email
 * apps' one-click unsubscribe (List-Unsubscribe-Post), so it needs no Origin: the token is the proof. Only
 * POST, so link scanners that open emails can't unsubscribe anyone by visiting.
 */

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = z.string().regex(/^[a-f0-9]{48}$/).safeParse(url.searchParams.get("t"));
  const ok = token.success && (await unsubscribe(token.data));
  return Response.redirect(new URL(`/emails/unsubscribe?${ok ? "done=1" : "invalid=1"}`, url), 303);
}
