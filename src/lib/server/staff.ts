import "server-only";
import { z } from "zod";
import { cookieFromRequest, createSessionCookie, readSessionCookie, sameOrigin, sessionCookieHeader as cookieHeader, verifySignIn } from "./auth-session";
import { adminAuth, db } from "./firebase";

/*
 * Who may use the admin panel, and the session that proves it. The one place that answers "is this a
 * signed-in member of staff, and what may they do?"; every admin page, route and action asks it.
 *
 * - The team lives in Firestore `staff/{email}`: role "owner" (one person: adds, changes and removes staff)
 *   or "staff" (day-to-day work). Not on the list means no access, whatever Google or the email link says.
 * - Sign-in proves the email with Firebase Auth (Google, or an email link we send). The server swaps that
 *   ID token for an httpOnly session cookie (SESSION_COOKIE), checked on every request, including whether
 *   it has been revoked. Removing someone deletes their entry and revokes their sessions at once.
 */

export const SESSION_COOKIE = "ws_admin";
export const SESSION_DAYS = 7;

export type StaffRole = "owner" | "staff";
export interface StaffMember {
  email: string;
  role: StaffRole;
  name: string | null;
  addedBy: string;
  addedAt: string;
}
export interface SignedInStaff {
  uid: string;
  email: string;
  role: StaffRole;
  name: string | null;
}

export const staffEmail = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")).pipe(z.string().max(254));

const staffDoc = (email: string) => db().collection("staff").doc(email.toLowerCase());

export async function getStaffMember(email: string): Promise<StaffMember | null> {
  const snap = await staffDoc(email).get();
  return snap.exists ? (snap.data() as StaffMember) : null;
}

export async function listStaff(): Promise<StaffMember[]> {
  const snap = await db().collection("staff").get();
  return snap.docs.map((d) => d.data() as StaffMember).sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role === "owner" ? -1 : 1));
}

export type SessionResult = { ok: true; cookie: string; staff: SignedInStaff } | { ok: false; status: 401 | 403; message: string };

/** Turns a fresh Firebase ID token into a session cookie value, if the email is on the team. */
export async function startSession(idToken: string): Promise<SessionResult> {
  const check = await verifySignIn(idToken);
  if (!check.ok) return check;
  const { person } = check;
  const member = await getStaffMember(person.email);
  if (!member) return { ok: false, status: 403, message: "This email isn't on the Woodspeaks team. Ask the owner to add you." };
  const cookie = await createSessionCookie(idToken, SESSION_DAYS);
  if (!member.name && person.name) await staffDoc(member.email).update({ name: person.name });
  return { ok: true, cookie, staff: { uid: person.uid, email: member.email, role: member.role, name: member.name ?? person.name } };
}

/** The member of staff behind a session cookie value, or null (no cookie, expired, revoked, or removed). */
export async function staffFromSession(cookie: string | undefined): Promise<SignedInStaff | null> {
  const person = await readSessionCookie(cookie);
  if (!person) return null;
  const member = await getStaffMember(person.email);
  return member ? { uid: person.uid, email: member.email, role: member.role, name: member.name } : null;
}

/** Reads the admin session cookie from a request's headers (route handlers). */
export const sessionFromRequest = (request: Request) => cookieFromRequest(request, SESSION_COOKIE);

export { sameOrigin };

export type StaffCheck = { ok: true; staff: SignedInStaff } | { ok: false; response: Response };

/** For admin route handlers: signed-in staff (optionally the owner), from our own pages. */
export async function requireStaffRequest(request: Request, role?: "owner"): Promise<StaffCheck> {
  if (request.method !== "GET" && !sameOrigin(request))
    return { ok: false, response: Response.json({ message: "Request refused." }, { status: 403 }) };
  const staff = await staffFromSession(sessionFromRequest(request));
  if (!staff) return { ok: false, response: Response.json({ message: "Sign in again." }, { status: 401 }) };
  if (role === "owner" && staff.role !== "owner")
    return { ok: false, response: Response.json({ message: "Only the owner can do that." }, { status: 403 }) };
  return { ok: true, staff };
}

/** Admin cookies are SameSite=Strict: no other site can ever send them. */
export const sessionCookieHeader = (value: string, maxAgeSeconds: number) => cookieHeader(SESSION_COOKIE, value, maxAgeSeconds, "Strict");

// --- Team changes (owner only; callers check that first) ---

async function audit(by: string, action: string, target: string) {
  await db().collection("auditLog").add({ at: new Date().toISOString(), by, action, target });
}

export async function addStaff(owner: SignedInStaff, email: string, role: StaffRole): Promise<{ ok: boolean; message: string }> {
  if (role === "owner") return { ok: false, message: "There's one owner. Add people as staff." };
  const ref = staffDoc(email);
  const added = await db().runTransaction(async (t) => {
    if ((await t.get(ref)).exists) return false;
    const member: StaffMember = { email: email.toLowerCase(), role, name: null, addedBy: owner.email, addedAt: new Date().toISOString() };
    t.create(ref, member);
    return true;
  });
  if (!added) return { ok: false, message: "That email is already on the team." };
  await audit(owner.email, "added staff", email);
  return { ok: true, message: `Added ${email}. They can sign in now.` };
}

export async function removeStaff(owner: SignedInStaff, email: string): Promise<{ ok: boolean; message: string }> {
  const member = await getStaffMember(email);
  if (!member) return { ok: false, message: "That email isn't on the team." };
  if (member.role === "owner") return { ok: false, message: "The owner can't be removed." };
  await staffDoc(email).delete();
  // Sign them out everywhere: their session cookies stop working on the next request.
  try {
    const auth = await adminAuth();
    const user = await auth.getUserByEmail(email);
    await auth.revokeRefreshTokens(user.uid);
  } catch {
    // Never signed in, so there's no session to end.
  }
  await audit(owner.email, "removed staff", email);
  return { ok: true, message: `Removed ${email}. They've been signed out.` };
}

/** Puts the owner on the team (setup script and tests). There is only ever one owner. */
export async function setOwner(email: string) {
  const owners = await db().collection("staff").where("role", "==", "owner").get();
  const batch = db().batch();
  owners.docs.filter((d) => d.id !== email.toLowerCase()).forEach((d) => batch.update(d.ref, { role: "staff" }));
  batch.set(staffDoc(email), { email: email.toLowerCase(), role: "owner", name: null, addedBy: "setup", addedAt: new Date().toISOString() }, { merge: true });
  await batch.commit();
}
