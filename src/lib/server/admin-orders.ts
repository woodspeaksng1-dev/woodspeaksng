import "server-only";
import { nextStatus, statusBlock, type FlowStatus, type OrderRow, type StoredOrder } from "@/lib/orders";
import { db } from "./firebase";
import type { SignedInStaff } from "./staff";

/*
 * Orders for the admin panel. Callers (pages, server actions) check the member of staff first and pass
 * them in; every change is made in a transaction (two staff can't both move an order on) and logged.
 */

const orders = () => db().collection("orders");

export async function listOrders(limit = 300): Promise<OrderRow[]> {
  const snap = await orders().orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => {
    const o = d.data() as StoredOrder;
    return {
      number: o.number,
      status: o.status,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      customerName: o.customer.name,
      zoneName: o.delivery.zoneName,
      deliveryDate: o.delivery.date,
      total: o.total,
      items: o.lines.map((l) => (l.quantity > 1 ? `${l.name} × ${l.quantity}` : l.name)).join(", "),
      nfcToWrite: o.nfc?.status === "to-write" && o.status !== "pending",
      paymentProblem: o.paymentProblem,
    };
  });
}

export async function loadOrder(number: string): Promise<StoredOrder | null> {
  if (!/^WS-[A-Z0-9]{6,12}$/.test(number)) return null;
  const snap = await orders().doc(number).get();
  return snap.exists ? (snap.data() as StoredOrder) : null;
}

export type ChangeResult = { ok: true; order: StoredOrder; message: string } | { ok: false; message: string };

const audit = (by: SignedInStaff, action: string, target: string) => ({ at: new Date().toISOString(), by: by.email, action, target });

/** Moves an order on one step (paid → crafting → dispatched → delivered). */
export async function advanceOrder(staff: SignedInStaff, number: string, to: FlowStatus): Promise<ChangeResult> {
  return db().runTransaction<ChangeResult>(async (t) => {
    const ref = orders().doc(number);
    const snap = await t.get(ref);
    if (!snap.exists) return { ok: false, message: "That order doesn't exist." };
    const order = snap.data() as StoredOrder;
    // `to` must be the order's very next step, so a stale page (someone else already moved it) is refused.
    const block = statusBlock(order, to);
    if (block) return { ok: false, message: nextStatus(order.status) === to ? block : "This order has changed. Refresh the page." };
    const at = new Date().toISOString();
    t.update(ref, { status: to, [`statusAt.${to}`]: at });
    t.create(db().collection("auditLog").doc(), audit(staff, `marked ${to}`, number));
    return { ok: true, order: { ...order, status: to }, message: "" };
  });
}

/** Records that the buyer's video is on the NFC tag. */
export async function markNfcWritten(staff: SignedInStaff, number: string): Promise<ChangeResult> {
  return db().runTransaction<ChangeResult>(async (t) => {
    const ref = orders().doc(number);
    const snap = await t.get(ref);
    if (!snap.exists) return { ok: false, message: "That order doesn't exist." };
    const order = snap.data() as StoredOrder;
    if (!order.nfc) return { ok: false, message: "This order has no NFC tag." };
    if (order.status === "pending") return { ok: false, message: "This order hasn't been paid yet." };
    if (order.nfc.status === "written") return { ok: true, order, message: "Already marked written." };
    t.update(ref, { "nfc.status": "written" });
    t.create(db().collection("auditLog").doc(), audit(staff, "wrote NFC tag", number));
    return { ok: true, order: { ...order, nfc: { status: "written" } }, message: "NFC tag marked written." };
  });
}

export interface CustomerRow {
  name: string;
  email: string;
  phone: string;
  orders: number;
  spent: number;
  lastOrder: string;
  marketingOptIn: boolean;
}

/** Everyone who has paid for an order, most recent first. Built from the orders themselves. */
export async function listCustomers(): Promise<CustomerRow[]> {
  const snap = await orders().orderBy("createdAt", "desc").limit(2000).get();
  const byEmail = new Map<string, CustomerRow>();
  for (const d of snap.docs) {
    const o = d.data() as StoredOrder;
    if (o.status === "pending" || o.status === "cancelled") continue;
    const c = byEmail.get(o.customer.email);
    if (c) {
      c.orders += 1;
      c.spent += o.total;
      // Orders come newest first, so the latest order's choice about updates stands.
    } else {
      byEmail.set(o.customer.email, { ...o.customer, orders: 1, spent: o.total, lastOrder: o.paidAt ?? o.createdAt });
    }
  }
  return [...byEmail.values()];
}
