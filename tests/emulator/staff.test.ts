import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Admin sign-in and the team, against the Firestore and Auth emulators (npm run test:emulator).
 * Real Firebase sign-ins (custom token → ID token), real session cookies, real route handlers.
 * Only the email sender is stood in for.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const mail = vi.hoisted(() => ({ send: vi.fn(async () => {}) }));
vi.mock("@/lib/server/email", async (original) => ({
  ...(await original<typeof import("@/lib/server/email")>()),
  sendEmail: mail.send,
}));

const { adminAuth } = await import("@/lib/server/firebase");
const staff = await import("@/lib/server/staff");
const sessionRoute = await import("@/app/api/admin/session/route");
const teamRoute = await import("@/app/api/admin/team/route");
const linkRoute = await import("@/app/api/admin/login-link/route");

const ORIGIN = "http://localhost";
const OWNER = "owner@woodspeaks.test";
const STAFF = "staff@woodspeaks.test";
const STRANGER = "stranger@example.com";

let ip = 0;
function request(path: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": `10.1.0.${++ip}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Signs in through the Auth emulator the way the browser would, and returns a fresh ID token. */
async function idTokenFor(email: string, emailVerified = true): Promise<string> {
  const auth = await adminAuth();
  const user = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, emailVerified }));
  if (user.emailVerified !== emailVerified) await auth.updateUser(user.uid, { emailVerified });
  const customToken = await auth.createCustomToken(user.uid);
  const res = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=test`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
  );
  return ((await res.json()) as { idToken: string }).idToken;
}

/** Signs in and returns the admin session cookie value (or the failed response). */
async function signIn(email: string) {
  const res = await sessionRoute.POST(request("/api/admin/session", "POST", { idToken: await idTokenFor(email) }));
  const setCookie = res.headers.get("set-cookie") ?? "";
  const value = decodeURIComponent(setCookie.match(/ws_admin=([^;]*)/)?.[1] ?? "");
  return { res, setCookie, value, cookieHeader: `ws_admin=${encodeURIComponent(value)}` };
}

beforeAll(async () => {
  await staff.setOwner(OWNER);
});
beforeEach(() => mail.send.mockClear());

describe("signing in", () => {
  it("gives the owner a session cookie that scripts can't read and other sites can't send", async () => {
    const { res, setCookie, value } = await signIn(OWNER);
    expect(res.status).toBe(200);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    expect(await staff.staffFromSession(value)).toMatchObject({ email: OWNER, role: "owner" });
  });

  it("turns away an email that isn't on the team, with no cookie", async () => {
    const { res, setCookie } = await signIn(STRANGER);
    expect(res.status).toBe(403);
    expect(setCookie).toBe("");
  });

  it("turns away an unverified email", async () => {
    const res = await sessionRoute.POST(request("/api/admin/session", "POST", { idToken: await idTokenFor("unverified@woodspeaks.test", false) }));
    expect(res.status).toBe(401);
  });

  it("refuses a made-up token", async () => {
    const res = await sessionRoute.POST(request("/api/admin/session", "POST", { idToken: "x".repeat(200) }));
    expect(res.status).toBe(401);
  });

  it("refuses sign-in requests from another website", async () => {
    const res = await sessionRoute.POST(request("/api/admin/session", "POST", { idToken: await idTokenFor(OWNER) }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("treats forged or garbage cookies as signed out", async () => {
    for (const cookie of [undefined, "", "abc", "eyJhbGciOiJub25lIn0.eyJlbWFpbCI6Im93bmVyQHdvb2RzcGVha3MudGVzdCJ9."])
      expect(await staff.staffFromSession(cookie)).toBeNull();
  });

  it("signs out by clearing the cookie", async () => {
    const res = await sessionRoute.DELETE(request("/api/admin/session", "DELETE"));
    expect(res.headers.get("set-cookie")).toMatch(/ws_admin=;.*Max-Age=0/);
  });
});

describe("the team", () => {
  it("only lets the owner add people, and only from our own pages", async () => {
    const owner = await signIn(OWNER);
    expect((await teamRoute.POST(request("/api/admin/team", "POST", { email: STRANGER }, { cookie: owner.cookieHeader, origin: "https://evil.example" }))).status).toBe(403);
    expect((await teamRoute.POST(request("/api/admin/team", "POST", { email: STRANGER }))).status).toBe(401);
    const added = await teamRoute.POST(request("/api/admin/team", "POST", { email: STAFF }, { cookie: owner.cookieHeader }));
    expect(added.status).toBe(200);
    expect((await teamRoute.POST(request("/api/admin/team", "POST", { email: STAFF }, { cookie: owner.cookieHeader }))).status).toBe(409);
  });

  it("lets a new member sign in as staff, who can't change the team", async () => {
    const member = await signIn(STAFF);
    expect(member.res.status).toBe(200);
    expect(await staff.staffFromSession(member.value)).toMatchObject({ email: STAFF, role: "staff" });
    expect((await teamRoute.POST(request("/api/admin/team", "POST", { email: STRANGER }, { cookie: member.cookieHeader }))).status).toBe(403);
    expect((await teamRoute.DELETE(request("/api/admin/team", "DELETE", { email: OWNER }, { cookie: member.cookieHeader }))).status).toBe(403);
  });

  it("cuts off a removed member at once, even with their old cookie", async () => {
    const member = await signIn(STAFF);
    const owner = await signIn(OWNER);
    expect((await teamRoute.DELETE(request("/api/admin/team", "DELETE", { email: STAFF }, { cookie: owner.cookieHeader }))).status).toBe(200);
    expect(await staff.staffFromSession(member.value)).toBeNull();
    expect((await signIn(STAFF)).res.status).toBe(403);
  });

  it("never removes the owner, including by themselves", async () => {
    const owner = await signIn(OWNER);
    expect((await teamRoute.DELETE(request("/api/admin/team", "DELETE", { email: OWNER }, { cookie: owner.cookieHeader }))).status).toBe(400);
    expect(await staff.getStaffMember(OWNER)).toMatchObject({ role: "owner" });
  });

  it("can't create a second owner", async () => {
    const owner = await signIn(OWNER);
    expect((await staff.addStaff((await staff.staffFromSession(owner.value))!, "second@woodspeaks.test", "owner")).ok).toBe(false);
  });
});

describe("email sign-in links", () => {
  it("emails a link to team members only, with the same reply for anyone", async () => {
    const forOwner = await linkRoute.POST(request("/api/admin/login-link", "POST", { email: OWNER }));
    const forStranger = await linkRoute.POST(request("/api/admin/login-link", "POST", { email: "nobody@example.com" }));
    expect(forOwner.status).toBe(200);
    expect(await forOwner.json()).toEqual(await forStranger.json());
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: OWNER }));
  });

  it("limits links per email address", async () => {
    const ask = () => linkRoute.POST(request("/api/admin/login-link", "POST", { email: "limit@example.com" }));
    for (let i = 0; i < 3; i++) expect((await ask()).status).toBe(200);
    expect((await ask()).status).toBe(429);
  });
});
