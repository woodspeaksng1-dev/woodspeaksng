import type { CartCustomization, Product } from "./types";

/*
 * What one item costs, in naira. Shared by the cart (display) and the server (the price we charge),
 * so the two never disagree. The server always applies it to products it read from Firestore itself.
 */
export function unitPrice(product: Product, customization: CartCustomization): number {
  let unit = product.price;
  if (customization.kind === "reasons" && customization.mode === "custom" && product.personalization.kind === "reasons") {
    unit += product.personalization.fee;
  }
  return unit;
}
