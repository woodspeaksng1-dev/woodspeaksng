import type { Product } from "./types";

/*
 * Stock (client, 18 Nov). Staff set how many units are in stock (blank: not counted, never runs out) and can
 * mark a product sold out by hand. Customers never see the count: shop pages get only "sold out"
 * (getStorefront strips it), and messages don't say how many are left. Paid orders take units off (lib/server/orders.ts, in the same transaction
 * that marks the order paid); at 0 the product shows as sold out. Checkout refuses sold-out products and
 * more units than are left, reading stock fresh from Firestore.
 */

type Stocked = Pick<Product, "stock" | "soldOut">;

/** Units left, or null when stock isn't counted. */
export const unitsLeft = (p: Stocked): number | null => (typeof p.stock === "number" ? Math.max(0, p.stock) : null);

/** Sold out: marked by staff, or counted and none left. */
export const isSoldOut = (p: Stocked) => !!p.soldOut || unitsLeft(p) === 0;
