import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { CustomerOrderRow, CustomerProfile, SavedAddress } from "@/lib/account";
import type { StoredOrder } from "@/lib/orders";
import { cookieFromRequest, createSessionCookie, readSessionCookie, sessionCookieHeader, verifySignIn, type VerifiedPerson } from "./auth-session";
import { db } from "./firebase";

/*
 * Customer accounts. Anyone with a verified email can sign in (Google or an email link); there's no
 * separate sign-up. Their orders are found by email, so orders placed as a guest show up too.
 * Everything is read and written on the server for the email in the session cookie, never for an email
 * the browser names. Profiles live in Firestore `customers/{email}`.
 */

export const CUSTOMER_COOKIE = "ws_customer";
/** Firebase allows session cookies of up to two weeks. */
export const CUSTOMER_SESSION_DAYS = 14;
export const MAX_ADDRESSES = 5;

const customerDoc = (email: string) => db().collection("customers").doc(email.toLowerCase());

/** Customer cookies are SameSite=Lax so a link from an email opens the account signed in; changes still check Origin. */
export const customerCookieHeader = (value: string, maxAgeSeconds: number) => sessionCookieHeader(CUSTOMER_COOKIE, value, maxAgeSeconds, "Lax");

export type CustomerSessionResult = { ok: true; cookie: string; person: VerifiedPerson } | { ok: false; status: 401; message: string };

export async function startCustomerSession(idToken: string): Promise<CustomerSessionResult> {
  const check = await verifySignIn(idToken);
  if (!check.ok) return check;
  const cookie = await createSessionCookie(idToken, CUSTOMER_SESSION_DAYS);
  // First sign-in creates the profile; later ones fill in a name if we didn't have one.
  await db().runTransaction(async (t) => {
    const ref = customerDoc(check.person.email);
    const snap = await t.get(ref);
    if (!snap.exists) t.create(ref, { email: check.person.email, name: check.person.name, phone: null, addresses: [], createdAt: new Date().toISOString() });
    else if (!snap.get("name") && check.person.name) t.update(ref, { name: check.person.name });
  });
  return { ok: true, cookie, person: check.person };
}

export const customerFromSession = (cookie: string | undefined) => readSessionCookie(cookie);
export const customerFromRequest = (request: Request) => customerFromSession(cookieFromRequest(request, CUSTOMER_COOKIE));

/** The customer's paid orders (newest first). Unpaid checkouts aren't orders, so they're left out. */
export async function listCustomerOrders(email: string): Promise<CustomerOrderRow[]> {
  const snap = await db().collection("orders").where("customer.email", "==", email.toLowerCase()).limit(100).get();
  return snap.docs
    .map((d) => d.data() as StoredOrder)
    .filter((o) => o.status !== "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => ({
      number: o.number,
      createdAt: o.createdAt,
      status: o.status,
      items: o.lines.map((l) => (l.quantity > 1 ? `${l.name} × ${l.quantity}` : l.name)).join(", "),
      total: o.total,
      deliveryDate: o.delivery.date,
      zoneName: o.delivery.zoneName,
    }));
}

/** Name, phone and saved addresses. Name and phone fall back to the latest order. */
export async function getCustomerProfile(person: VerifiedPerson): Promise<CustomerProfile> {
  const [snap, latest] = await Promise.all([
    customerDoc(person.email).get(),
    db().collection("orders").where("customer.email", "==", person.email).limit(20).get(),
  ]);
  const lastOrder = latest.docs
    .map((d) => d.data() as StoredOrder)
    .filter((o) => o.status !== "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const data = snap.exists ? (snap.data() as Partial<CustomerProfile>) : {};
  return {
    email: person.email,
    name: data.name ?? lastOrder?.customer.name ?? person.name,
    phone: data.phone ?? lastOrder?.customer.phone ?? null,
    addresses: data.addresses ?? [],
  };
}

export const addressInput = z.object({
  label: z.string().trim().min(1, "Name this address, e.g. Home or Mum's.").max(40, "Keep the name under 40 characters."),
  zoneId: z.string().min(1, "Choose a delivery area.").max(64),
  address: z.string().trim().min(8, "Enter the full address.").max(240, "That address is too long."),
  landmark: z.string().trim().max(120, "Keep the landmark under 120 characters."),
});
export type AddressInput = z.infer<typeof addressInput>;

export async function addAddress(email: string, input: AddressInput, validZoneIds: Set<string>): Promise<{ ok: boolean; message: string }> {
  if (!validZoneIds.has(input.zoneId)) return { ok: false, message: "Choose a delivery area from the list." };
  return db().runTransaction(async (t) => {
    const ref = customerDoc(email);
    const snap = await t.get(ref);
    const addresses = (snap.get("addresses") as SavedAddress[] | undefined) ?? [];
    if (addresses.length >= MAX_ADDRESSES) return { ok: false, message: `You can save up to ${MAX_ADDRESSES} addresses. Remove one first.` };
    const next = [...addresses, { id: randomUUID(), ...input }];
    if (snap.exists) t.update(ref, { addresses: next });
    else t.create(ref, { email, name: null, phone: null, addresses: next, createdAt: new Date().toISOString() });
    return { ok: true, message: `Saved ${input.label}.` };
  });
}

export async function removeAddress(email: string, id: string): Promise<{ ok: boolean; message: string }> {
  return db().runTransaction(async (t) => {
    const ref = customerDoc(email);
    const snap = await t.get(ref);
    const addresses = (snap.get("addresses") as SavedAddress[] | undefined) ?? [];
    if (!addresses.some((a) => a.id === id)) return { ok: false, message: "That address isn't saved." };
    t.update(ref, { addresses: addresses.filter((a) => a.id !== id) });
    return { ok: true, message: "Address removed." };
  });
}
