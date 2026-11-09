import "server-only";
import { createHash } from "node:crypto";
import { db } from "./firebase";

/*
 * Fixed-window rate limit kept in Firestore (`rateLimits`), so it holds across serverless instances.
 * Keys are hashed: no IP addresses are stored. Old windows are left to expire via a Firestore TTL
 * policy on `expiresAt` (set it up once in the console: Firestore → TTL → rateLimits / expiresAt).
 */
export async function allow(scope: string, who: string, limit: number, windowSeconds: number): Promise<boolean> {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const id = createHash("sha256").update(`${scope}:${who}:${window}`).digest("hex").slice(0, 40);
  const ref = db().collection("rateLimits").doc(id);
  return db().runTransaction(async (t) => {
    const count = ((await t.get(ref)).get("count") as number | undefined) ?? 0;
    if (count >= limit) return false;
    t.set(ref, { count: count + 1, expiresAt: new Date((window + 2) * windowSeconds * 1000) }, { merge: true });
    return true;
  });
}

/** The caller's IP as Vercel reports it (first hop of x-forwarded-for). */
export const clientIp = (headers: Headers) => headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
