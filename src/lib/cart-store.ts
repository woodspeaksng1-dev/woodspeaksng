"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartCustomization, CartItem } from "./types";
import { getProduct } from "./catalog";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (productId: string, customization?: CartCustomization) => void;
  remove: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
}

const newLineId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * The cart lives in localStorage so personalised text survives refreshes,
 * tab switches and the Paystack redirect. It stores product IDs and choices
 * only — the server always recalculates prices at checkout.
 */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      add: (productId, customization = { kind: "none" }) =>
        set((state) => {
          // Plain items merge into one line; personalised items are always their own line.
          if (customization.kind === "none") {
            const existing = state.items.find(
              (i) => i.productId === productId && i.customization.kind === "none",
            );
            if (existing) {
              return {
                isOpen: true,
                items: state.items.map((i) =>
                  i.lineId === existing.lineId ? { ...i, quantity: i.quantity + 1 } : i,
                ),
              };
            }
          }
          return {
            isOpen: true,
            items: [...state.items, { lineId: newLineId(), productId, quantity: 1, customization }],
          };
        }),
      remove: (lineId) => set((s) => ({ items: s.items.filter((i) => i.lineId !== lineId) })),
      setQuantity: (lineId, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.lineId === lineId ? { ...i, quantity: Math.max(0, Math.min(20, quantity)) } : i))
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "woodspeaks-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      skipHydration: true,
    },
  ),
);

/** Display-only subtotal. Checkout totals are computed on the server. */
export function lineTotal(item: CartItem) {
  const product = getProduct(item.productId);
  if (!product) return 0;
  let unit = product.price;
  if (
    item.customization.kind === "reasons" &&
    item.customization.mode === "custom" &&
    product.personalization.kind === "reasons"
  ) {
    unit += product.personalization.fee;
  }
  return unit * item.quantity;
}

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((n, i) => n + lineTotal(i), 0);

/** True once the saved cart has been restored, so pages don't flash "your cart is empty". */
export function useCartHydrated() {
  return useSyncExternalStore(
    (onChange) => useCart.persist.onFinishHydration(onChange),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}
