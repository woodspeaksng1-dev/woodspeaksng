"use client";

import type { CheckoutDetails } from "./checkout";
import type { CartCustomization } from "./types";

/*
 * DEMO ONLY, until Paystack and Firestore exist (backend stage). The order is kept in this
 * tab so the confirmation page can show it. The real flow creates a pending order on the
 * server, prices it there, and the confirmation page reads its status from the server.
 */

export interface DemoOrderLine {
  name: string;
  quantity: number;
  /** Display total for the line, from the catalog. Not trusted for payment. */
  total: number;
  customization: CartCustomization;
}

export interface DemoOrder {
  number: string;
  placedAt: string;
  details: CheckoutDetails;
  zoneName: string;
  lines: DemoOrderLine[];
  subtotal: number;
  deliveryFee: number | null;
}

const KEY = "ws-demo-order";

export function saveDemoOrder(order: DemoOrder) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {}
}

export function loadDemoOrder(): DemoOrder | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "null") as DemoOrder | null;
  } catch {
    return null;
  }
}

export function demoOrderNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = crypto.getRandomValues(new Uint8Array(6));
  return `WS-${Array.from(pick, (n) => chars[n % chars.length]).join("")}`;
}
