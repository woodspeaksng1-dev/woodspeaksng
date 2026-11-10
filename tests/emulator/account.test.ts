import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog";
import type { StoredOrder } from "@/lib/orders";

/*
 * Customer accounts against the Firestore and Auth emulators (npm run test:emulator): real sign-ins and
 * session cookies, real routes and actions. Stood in for: the email sender, and (for the actions) who is
 * signed in.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const mail = vi.hoisted(() => ({ send: vi.fn(async () => {}) }));
vi.mock("@/lib/server/email", async (original) => ({ ...(await original<typeof import("@/lib/server/email")>()), sendEmail: mail.send }));
const session = vi.hoisted(() => ({ person: null as null | { uid: string; email: string; name: string | null } }));
vi.mock("@/lib/server/customer-session", () => ({ currentCustomer: async () => session.person }));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {}, updateTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {}, after: (fn: () => unknown) => void fn() }));

const { adminAuth, db } = await import("@/lib/server/firebase");
const customers = await import("@/lib/server/customers");
const sessionRoute = await import("@/app/api/account/session/route");
const meRoute = await import("@/app/api/account/me/route");
const linkRoute = await import("@/app/api/account/login-link/route");
const actions = await import("@/app/(site)/account/actions");

const ORIGIN = "http://localhost";
let ip = 0;
const request = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}${path}`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": `10.2.0.${++ip}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function idTokenFor(email: string, emailVerified = true, displayName?: string) {
  const auth = await adminAuth();
  const user = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, emailVerified, displayName }));
  const res = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=test`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: await auth.createCustomToken(user.uid), returnSecureToken: true }) },
  );
  return ((await res.json()) as { idToken: string }).idToken;
}

async function signIn(email: string, displayName?: string) {
  const res = await sessionRoute.POST(request("/api/account/session", "POST", { idToken: await idTokenFor(email, true, displayName) }));
  const setCookie = res.headers.get("set-cookie") ?? "";
  const value = setCookie.match(/ws_customer=([^;]*)/)?.[1] ?? "";
  return { res, setCookie, cookieHeader: `ws_customer=${value}` };
}

function order(number: string, email: string, status: StoredOrder["status"], createdAt: string): StoredOrder {
  return {
    number,
    status,
    createdAt,
    paidAt: status === "pending" ? null : createdAt,
    customer: { name: "Alice Ade", email, phone: "08031112222", marketingOptIn: false },
    recipient: null,
    delivery: { zoneId: "yaba", zoneName: "Yaba", address: "1 Test Road", landmark: "", date: "2030-02-14", hidePrice: false },
    lines: [{ productId: "rose", name: "Real Rose", unitPrice: 10000, quantity: 1, lineTotal: 10000, customization: { kind: "none" } }],
    itemsTotal: 10000,
    deliveryFee: 5000,
    total: 15000,
    amountKobo: 1_500_000,
    currency: "NGN",
    nfc: null,
    paystack: null,
    paymentProblem: null,
  };
}

beforeAll(async () => {
  const batch = db().batch();
  SEED_CATALOG.products.forEach((p, i) => batch.set(db().doc(`products/${p.id}`), { ...p, sortOrder: i }));
  SEED_CATALOG.zones.forEach((z, i) => batch.set(db().doc(`shippingZones/${z.id}`), { ...z, sortOrder: i }));
  batch.set(db().doc("settings/shop"), { craftingDays: 3 });
  batch.set(db().doc("orders/WS-ACCTA00001"), order("WS-ACCTA00001", "alice@example.com", "paid", "2026-11-01T10:00:00Z"));
  batch.set(db().doc("orders/WS-ACCTA00002"), order("WS-ACCTA00002", "alice@example.com", "delivered", "2026-10-01T10:00:00Z"));
  batch.set(db().doc("orders/WS-ACCTA00003"), order("WS-ACCTA00003", "alice@example.com", "pending", "2026-11-05T10:00:00Z"));
  batch.set(db().doc("orders/WS-ACCTB00001"), order("WS-ACCTB00001", "bob@example.com", "paid", "2026-11-02T10:00:00Z"));
  await batch.commit();
});
beforeEach(() => {
  mail.send.mockClear();
  session.person = null;
});

describe("signing in", () => {
  it("gives any verified email an account and a session cookie scripts can't read", async () => {
    const { res, setCookie } = await signIn("alice@example.com", "Alice Ade");
    expect(res.status).toBe(200);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect((await db().doc("customers/alice@example.com").get()).get("name")).toBe("Alice Ade");
  });

  it("refuses unverified emails, made-up tokens and other websites", async () => {
    expect((await sessionRoute.POST(request("/api/account/session", "POST", { idToken: await idTokenFor("unverified@example.com", false) }))).status).toBe(401);
    expect((await sessionRoute.POST(request("/api/account/session", "POST", { idToken: "x".repeat(200) }))).status).toBe(401);
    expect((await sessionRoute.POST(request("/api/account/session", "POST", { idToken: await idTokenFor("alice@example.com") }, { origin: "https://evil.example" }))).status).toBe(403);
  });

  it("treats a forged cookie as signed out", async () => {
    expect(await customers.customerFromSession("abc")).toBeNull();
    const res = await meRoute.GET(request("/api/account/me", "GET", undefined, { cookie: "ws_customer=forged" }));
    expect(await res.json()).toEqual({ signedIn: false });
  });
});

describe("your orders", () => {
  it("lists only your own paid orders, newest first, including guest orders", async () => {
    const rows = await customers.listCustomerOrders("alice@example.com");
    expect(rows.map((r) => r.number)).toEqual(["WS-ACCTA00001", "WS-ACCTA00002"]);
    expect((await customers.listCustomerOrders("bob@example.com")).map((r) => r.number)).toEqual(["WS-ACCTB00001"]);
  });

  it("checkout prefill returns your own details only", async () => {
    const alice = await signIn("alice@example.com");
    const me = await (await meRoute.GET(request("/api/account/me", "GET", undefined, { cookie: alice.cookieHeader }))).json();
    expect(me).toMatchObject({ signedIn: true, email: "alice@example.com", phone: "08031112222" });
    expect(JSON.stringify(me)).not.toContain("bob@example.com");
  });
});

describe("saved addresses", () => {
  const home = { label: "Home", zoneId: "yaba", address: "12 Herbert Macaulay Way", landmark: "" };

  it("saves up to five, in real delivery areas only", async () => {
    session.person = { uid: "c1", email: "carol@example.com", name: null };
    expect((await actions.saveAddress({ ...home, zoneId: "the-moon" })).ok).toBe(false);
    expect((await actions.saveAddress({ ...home, address: "short" })).ok).toBe(false);
    for (let i = 0; i < 5; i++) expect((await actions.saveAddress({ ...home, label: `Place ${i}` })).ok).toBe(true);
    expect((await actions.saveAddress(home)).message).toMatch(/up to 5/);
  });

  it("only ever touches your own addresses", async () => {
    session.person = { uid: "a1", email: "alice@example.com", name: null };
    await actions.saveAddress(home);
    const aliceAddress = (await customers.getCustomerProfile(session.person)).addresses[0];
    session.person = { uid: "b1", email: "bob@example.com", name: null };
    expect((await actions.deleteAddress(aliceAddress.id)).ok).toBe(false);
    session.person = { uid: "a1", email: "alice@example.com", name: null };
    expect((await customers.getCustomerProfile(session.person)).addresses.some((a) => a.id === aliceAddress.id)).toBe(true);
    expect((await actions.deleteAddress(aliceAddress.id)).ok).toBe(true);
  });

  it("does nothing when signed out", async () => {
    expect((await actions.saveAddress(home)).message).toMatch(/Sign in/);
  });
});

describe("email sign-in links", () => {
  it("sends a link, at most three an hour per email", async () => {
    const ask = () => linkRoute.POST(request("/api/account/login-link", "POST", { email: "dave@example.com" }));
    for (let i = 0; i < 3; i++) expect((await ask()).status).toBe(200);
    expect((await ask()).status).toBe(429);
    expect(mail.send).toHaveBeenCalledTimes(3);
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: "dave@example.com" }));
  });

  it("refuses requests from other websites", async () => {
    expect((await linkRoute.POST(request("/api/account/login-link", "POST", { email: "x@example.com" }, { origin: "https://evil.example" }))).status).toBe(403);
  });
});
