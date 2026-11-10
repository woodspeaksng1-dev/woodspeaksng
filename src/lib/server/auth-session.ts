import "server-only";
import { adminAuth } from "./firebase";

/*
 * Sign-in sessions, shared by staff (admin) and customers (account). Firebase proves an email (Google or
 * an email link) in the browser; the server checks that ID token and swaps it for its own httpOnly
 * session cookie, which is verified on every request, including whether it has been revoked.
 * Who may do what is decided by the caller (staff.ts: on the team; customers.ts: any verified email).
 */

/** Sign-in must be this fresh to start a session (Firebase also enforces 5 minutes). */
const RECENT_SIGN_IN_SECONDS = 5 * 60;

export interface VerifiedPerson {
  uid: string;
  email: string;
  name: string | null;
}

export type SignInCheck = { ok: true; person: VerifiedPerson } | { ok: false; status: 401; message: string };

/** Checks a fresh Firebase ID token from the browser: genuine, recent, and for a verified email. */
export async function verifySignIn(idToken: string): Promise<SignInCheck> {
  let decoded;
  try {
    decoded = await (await adminAuth()).verifyIdToken(idToken, true);
  } catch {
    return { ok: false, status: 401, message: "That sign-in didn't work. Try again." };
  }
  if (!decoded.email || !decoded.email_verified) return { ok: false, status: 401, message: "Sign in with a verified email address." };
  if (Date.now() / 1000 - decoded.auth_time > RECENT_SIGN_IN_SECONDS)
    return { ok: false, status: 401, message: "That sign-in has expired. Sign in again." };
  return { ok: true, person: { uid: decoded.uid, email: decoded.email.toLowerCase(), name: decoded.name ?? null } };
}

export async function createSessionCookie(idToken: string, days: number): Promise<string> {
  return (await adminAuth()).createSessionCookie(idToken, { expiresIn: days * 24 * 60 * 60 * 1000 });
}

/** The person behind a session cookie value, or null (no cookie, expired, revoked or forged). */
export async function readSessionCookie(cookie: string | undefined): Promise<VerifiedPerson | null> {
  if (!cookie) return null;
  try {
    const decoded = await (await adminAuth()).verifySessionCookie(cookie, true);
    return decoded.email ? { uid: decoded.uid, email: decoded.email.toLowerCase(), name: decoded.name ?? null } : null;
  } catch (error) {
    // Expired, revoked or forged cookies are normal; anything else (Firebase down, misconfiguration) is logged.
    const code = (error as { code?: string }).code ?? "";
    if (!/session-cookie|argument-error|user-disabled|user-not-found|id-token/.test(code)) console.error("Session check failed.", error);
    return null;
  }
}

/** A cookie's value from a request's headers (route handlers). */
export function cookieFromRequest(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * Route handlers that change data require the request to come from our own pages (Origin matches), on
 * top of the SameSite cookie, so another site can't act in a signed-in browser.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

export const sessionCookieHeader = (name: string, value: string, maxAgeSeconds: number, sameSite: "Strict" | "Lax") =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=${sameSite}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
