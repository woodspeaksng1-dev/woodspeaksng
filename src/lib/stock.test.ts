import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "./catalog";
import { priceOrder, type PricingResult } from "./order-pricing";
import { isSoldOut, unitsLeft } from "./stock";
import type { Catalog, Product } from "./types";

const base = SEED_CATALOG.products.find((p) => p.id === "pocket-watch")!;
const withStock = (stock: number | null | undefined, soldOut?: boolean): Product => ({ ...base, stock, soldOut });

describe("stock rules", () => {
  it("not counted never runs out; counted runs out at 0; staff can mark sold out", () => {
    expect(isSoldOut(withStock(undefined))).toBe(false);
    expect(unitsLeft(withStock(null))).toBeNull();
    expect(isSoldOut(withStock(3))).toBe(false);
    expect(isSoldOut(withStock(0))).toBe(true);
    expect(unitsLeft(withStock(-2))).toBe(0); // never shows a negative count
    expect(isSoldOut(withStock(80, true))).toBe(true);
    expect(isSoldOut(withStock(null, true))).toBe(true);
  });
});

describe("checkout and stock", () => {
  const catalogWith = (changes: Partial<Record<string, Partial<Product>>>): Catalog => ({
    ...SEED_CATALOG,
    products: SEED_CATALOG.products.map((p) => ({ ...p, ...changes[p.id] })),
  });
  const order = (catalog: Catalog, lines: { productId: string; quantity: number; customization: unknown }[]) =>
    priceOrder(catalog, { zoneId: "lekki-phase-1", lines });
  const plain = (productId: string, quantity = 1) => ({ productId, quantity, customization: { kind: "none" } });
  const letter = (text: string) => ({ productId: "scroll", quantity: 1, customization: { kind: "letter", text } });
  const messages = (r: PricingResult) => (r.ok ? "" : r.problems.map((p) => p.message).join(" | "));

  it("refuses a sold-out product, counted or marked", () => {
    expect(messages(order(catalogWith({ "pocket-watch": { stock: 0 } }), [plain("pocket-watch")]))).toMatch(/sold out/);
    expect(messages(order(catalogWith({ "pocket-watch": { stock: 9, soldOut: true } }), [plain("pocket-watch")]))).toMatch(/sold out/);
  });

  it("refuses more than are left, counting every line of the product together", () => {
    const two = catalogWith({ "pocket-watch": { stock: 2 }, scroll: { stock: 1 } });
    expect(order(two, [plain("pocket-watch", 2)]).ok).toBe(true);
    expect(messages(order(two, [plain("pocket-watch", 3)]))).toMatch(/don't have that many Pocket Watch/);
    expect(messages(order(two, [plain("pocket-watch", 3)]))).not.toMatch(/\d/); // never says how many are left
    expect(order(two, [letter("For you, always.")]).ok).toBe(true);
    expect(messages(order(two, [letter("For you, always."), letter("And for you too.")]))).toMatch(/don't have that many/);
  });

  it("leaves products whose stock isn't counted alone", () => {
    expect(order(catalogWith({}), [plain("pocket-watch", 20)]).ok).toBe(true);
  });
});
