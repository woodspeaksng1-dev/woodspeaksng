"use client";

import { create } from "zustand";
import { CRAFTING_DAYS, PRODUCTS, SHIPPING_ZONES, getProduct } from "../catalog";
import type { Product, ShippingZone } from "../types";
import { MOMENTS, type Moment } from "../gallery";
import {
  SAMPLE_ENQUIRIES,
  SAMPLE_ORDERS,
  SAMPLE_REMINDERS,
  type AdminOrder,
  type AdminReview,
  type NfcStatus,
  type OrderStatus,
} from "./sample-data";

/*
 * DEMO admin state: in memory only, so changes last until the page reloads. In the backend
 * stage each action becomes a server action that checks the staff claim, writes Firestore,
 * sends the status email and adds an audit log entry.
 */

export const STATUS_FLOW: OrderStatus[] = ["paid", "crafting", "dispatched", "delivered"];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "Paid",
  crafting: "Crafting",
  dispatched: "Dispatched",
  delivered: "Delivered",
};
export const NFC_LABEL: Record<NfcStatus, string> = {
  awaiting: "Waiting for upload",
  uploaded: "Upload to review",
  approved: "Approved, tag to write",
  written: "Tag written",
};
export const HOME_FEATURED_MAX = 6;

export interface AdminProduct extends Product {
  hidden: boolean;
  dimensions: string;
  included: string;
  seoTitle: string;
  imageAlt: string;
}

export interface AuditEntry {
  at: string;
  by: string;
  what: string;
}

const STAFF = "Demo staff";

interface AdminState {
  orders: AdminOrder[];
  products: AdminProduct[];
  zones: ShippingZone[];
  craftingDays: number;
  moments: Moment[];
  reviews: AdminReview[];
  reminders: typeof SAMPLE_REMINDERS;
  enquiries: typeof SAMPLE_ENQUIRIES;
  audit: AuditEntry[];
  setStatus: (number: string, status: OrderStatus) => string | null;
  setNfc: (number: string, status: NfcStatus) => void;
  updateProduct: (id: string, patch: Partial<AdminProduct>) => void;
  toggleFeatured: (id: string) => string | null;
  moveMoment: (id: string, by: -1 | 1) => void;
  updateZone: (id: string, patch: Partial<ShippingZone>) => void;
  setCraftingDays: (days: number) => void;
  addReview: (review: Omit<AdminReview, "id" | "approved">) => void;
  setReviewApproved: (id: string, approved: boolean) => void;
  logEmail: (what: string) => void;
}

/** Why a status change isn't allowed, or null if it is. */
export function statusBlock(order: AdminOrder, next: OrderStatus): string | null {
  if (STATUS_FLOW.indexOf(next) < STATUS_FLOW.indexOf(order.status)) return "Orders move forward only.";
  if (order.nfc && STATUS_FLOW.indexOf(next) >= STATUS_FLOW.indexOf("dispatched") && order.nfc.status !== "written")
    return "Approve the memory upload and write the NFC tag before dispatching.";
  return null;
}

export function orderTotal(order: AdminOrder) {
  return order.lines.reduce((sum, l) => {
    const p = getProduct(l.productId);
    if (!p) return sum;
    const fee =
      l.customization.kind === "reasons" && l.customization.mode === "custom" && p.personalization.kind === "reasons"
        ? p.personalization.fee
        : 0;
    return sum + (p.price + fee) * l.quantity;
  }, 0);
}

export const useAdmin = create<AdminState>()((set, get) => {
  const log = (what: string) => ({ at: new Date().toISOString(), by: STAFF, what });
  return {
    orders: SAMPLE_ORDERS,
    products: PRODUCTS.map((p) => ({
      ...p,
      hidden: false,
      dimensions: "",
      included: "",
      seoTitle: p.name,
      imageAlt: p.name,
    })),
    zones: SHIPPING_ZONES,
    craftingDays: CRAFTING_DAYS,
    moments: MOMENTS,
    reviews: [],
    reminders: SAMPLE_REMINDERS,
    enquiries: SAMPLE_ENQUIRIES,
    audit: [],

    setStatus: (number, status) => {
      const order = get().orders.find((o) => o.number === number);
      if (!order) return "Order not found.";
      const block = statusBlock(order, status);
      if (block) return block;
      set((s) => ({
        orders: s.orders.map((o) => (o.number === number ? { ...o, status } : o)),
        audit: [log(`${number}: status to ${STATUS_LABEL[status]} (customer emailed)`), ...s.audit],
      }));
      return null;
    },
    setNfc: (number, status) =>
      set((s) => ({
        orders: s.orders.map((o) => (o.number === number && o.nfc ? { ...o, nfc: { ...o.nfc, status } } : o)),
        audit: [log(`${number}: NFC ${NFC_LABEL[status].toLowerCase()}`), ...s.audit],
      })),
    updateProduct: (id, patch) =>
      set((s) => ({
        products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        audit: [log(`Product ${s.products.find((p) => p.id === id)?.name}: ${Object.keys(patch).join(", ")} changed`), ...s.audit],
      })),
    toggleFeatured: (id) => {
      const { products } = get();
      const p = products.find((x) => x.id === id);
      if (!p) return null;
      if (!p.featured && products.filter((x) => x.featured).length >= HOME_FEATURED_MAX)
        return `The home page shows ${HOME_FEATURED_MAX}. Remove one first.`;
      get().updateProduct(id, { featured: !p.featured });
      return null;
    },
    moveMoment: (id, by) =>
      set((s) => {
        const i = s.moments.findIndex((m) => m.id === id);
        const j = i + by;
        if (i < 0 || j < 0 || j >= s.moments.length) return s;
        const moments = [...s.moments];
        [moments[i], moments[j]] = [moments[j], moments[i]];
        return { moments, audit: [log(`Customer moments reordered`), ...s.audit] };
      }),
    updateZone: (id, patch) =>
      set((s) => ({
        zones: s.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
        audit: [log(`Delivery zone ${s.zones.find((z) => z.id === id)?.name} updated`), ...s.audit],
      })),
    setCraftingDays: (craftingDays) =>
      set((s) => ({ craftingDays, audit: [log(`Crafting time set to ${craftingDays} days`), ...s.audit] })),
    addReview: (review) =>
      set((s) => ({
        reviews: [{ ...review, id: `rv${Date.now()}`, approved: false }, ...s.reviews],
        audit: [log(`Review from ${review.who} added`), ...s.audit],
      })),
    setReviewApproved: (id, approved) =>
      set((s) => ({
        reviews: s.reviews.map((r) => (r.id === id ? { ...r, approved } : r)),
        audit: [log(`Review ${approved ? "approved" : "hidden"}`), ...s.audit],
      })),
    logEmail: (what) => set((s) => ({ audit: [log(what), ...s.audit] })),
  };
});
