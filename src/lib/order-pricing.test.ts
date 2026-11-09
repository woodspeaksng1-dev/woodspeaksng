import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "./catalog";
import { priceOrder, toKobo, MAX_LINES, type PricingResult } from "./order-pricing";
import type { Catalog } from "./types";

// The starting catalog with delivery fees set, plus one hidden product.
const catalog: Catalog = {
  ...SEED_CATALOG,
  products: SEED_CATALOG.products.map((p) => (p.id === "journal" ? { ...p, hidden: true } : p)),
  zones: SEED_CATALOG.zones.map((z) => ({ ...z, fee: z.id === "nationwide" ? null : 3000 })),
};

const LAGOS = "lagos-island"; // takes fresh items, fee ₦3,000
const OUTSKIRTS = "lagos-outskirts"; // no fresh items
const NO_FEE = "nationwide"; // fee not set yet

const twentyReasons = Array.from({ length: 20 }, (_, i) => `Reason number ${i + 1}`);

function ok(result: PricingResult) {
  if (!result.ok) throw new Error(`Expected a priced order, got: ${JSON.stringify(result.problems)}`);
  return result.order;
}
function problems(result: PricingResult) {
  if (result.ok) throw new Error("Expected the order to be refused");
  return result.problems.map((p) => p.message).join(" | ");
}

describe("prices come from the catalog, never the browser", () => {
  it("prices plain items by quantity and adds the area's delivery fee", () => {
    const order = ok(priceOrder(catalog, { zoneId: LAGOS, lines: [{ productId: "pocket-watch", quantity: 2, customization: { kind: "none" } }] }));
    expect(order.lines[0]).toMatchObject({ name: "Pocket Watch", unitPrice: 15000, quantity: 2, lineTotal: 30000 });
    expect(order.itemsTotal).toBe(30000);
    expect(order.deliveryFee).toBe(3000);
    expect(order.total).toBe(33000);
  });

  it("ignores any price or total the browser sends", () => {
    const order = ok(
      priceOrder(catalog, {
        zoneId: LAGOS,
        total: 1,
        lines: [{ productId: "pocket-watch", quantity: 1, customization: { kind: "none" }, price: 1, unitPrice: 1, lineTotal: 1 }],
      }),
    );
    expect(order.total).toBe(18000);
    expect(order.lines[0]).not.toHaveProperty("price");
  });

  it("charges the standard puzzle at its price and write-your-own at price plus fee", () => {
    const standard = ok(priceOrder(catalog, { zoneId: LAGOS, lines: [{ productId: "love-puzzle", quantity: 1, customization: { kind: "reasons", mode: "standard", reasons: [] } }] }));
    expect(standard.itemsTotal).toBe(20000);
    const custom = ok(priceOrder(catalog, { zoneId: LAGOS, lines: [{ productId: "love-puzzle", quantity: 1, customization: { kind: "reasons", mode: "custom", reasons: twentyReasons } }] }));
    expect(custom.itemsTotal).toBe(35000);
  });

  it("totals several lines", () => {
    const order = ok(
      priceOrder(catalog, {
        zoneId: LAGOS,
        lines: [
          { productId: "scroll", quantity: 1, customization: { kind: "letter", text: "Happy birthday, my love." } },
          { productId: "nfc-tag", quantity: 1, customization: { kind: "video", source: "link", url: "https://youtu.be/abc" } },
          { productId: "rose", quantity: 3, customization: { kind: "none" } },
        ],
      }),
    );
    expect(order.itemsTotal).toBe(15590 + 7000 + 3 * 10000);
    expect(order.total).toBe(order.itemsTotal + 3000);
  });

  it("leaves delivery out of the total while an area's fee isn't set", () => {
    const order = ok(priceOrder(catalog, { zoneId: NO_FEE, lines: [{ productId: "pocket-watch", quantity: 1, customization: { kind: "none" } }] }));
    expect(order.deliveryFee).toBeNull();
    expect(order.total).toBe(15000);
  });
});

describe("refuses what can't be sold", () => {
  const plain = (productId: string, quantity: unknown = 1) => ({ productId, quantity, customization: { kind: "none" } });

  it("an empty cart", () => expect(problems(priceOrder(catalog, { zoneId: LAGOS, lines: [] }))).toMatch(/empty/));
  it("too many lines", () =>
    expect(problems(priceOrder(catalog, { zoneId: LAGOS, lines: Array(MAX_LINES + 1).fill(plain("rose")) }))).toMatch(/up to/));
  it("an unknown product", () => expect(problems(priceOrder(catalog, { zoneId: LAGOS, lines: [plain("free-car")] }))).toMatch(/no longer available/));
  it("a hidden product", () => expect(problems(priceOrder(catalog, { zoneId: LAGOS, lines: [plain("journal")] }))).toMatch(/no longer available/));
  it.each([0, -1, 21, 1.5, "2", null])("a quantity of %s", (q) => {
    expect(priceOrder(catalog, { zoneId: LAGOS, lines: [plain("rose", q)] }).ok).toBe(false);
  });
  it("an unknown delivery area", () => expect(problems(priceOrder(catalog, { zoneId: "moon", lines: [plain("rose")] }))).toMatch(/delivery area/));
  it("a fresh item to an area that can't take it", () =>
    expect(problems(priceOrder(catalog, { zoneId: OUTSKIRTS, lines: [plain("rose")] }))).toMatch(/fresh/));
  it("garbage instead of an order", () => {
    for (const bad of [null, "order", 42, {}, { lines: "x", zoneId: LAGOS }]) expect(priceOrder(catalog, bad).ok).toBe(false);
  });
});

describe("checks personalisation against the product", () => {
  const line = (productId: string, customization: unknown) => ({ zoneId: LAGOS, lines: [{ productId, quantity: 1, customization }] });

  it("a letter on a product without personalisation", () =>
    expect(priceOrder(catalog, line("pocket-watch", { kind: "letter", text: "Hi" })).ok).toBe(false));
  it("no letter on the scroll", () => expect(priceOrder(catalog, line("scroll", { kind: "none" })).ok).toBe(false));
  it("an empty letter", () => expect(priceOrder(catalog, line("scroll", { kind: "letter", text: "   " })).ok).toBe(false));
  it("a letter over the word limit", () =>
    expect(problems(priceOrder(catalog, line("scroll", { kind: "letter", text: "word ".repeat(301) })))).toMatch(/300 words/));
  it("markup in a letter", () =>
    expect(problems(priceOrder(catalog, line("scroll", { kind: "letter", text: "<script>alert(1)</script>" })))).toMatch(/unsupported/));
  it("a letter at exactly the limit", () => expect(priceOrder(catalog, line("scroll", { kind: "letter", text: "word ".repeat(300) })).ok).toBe(true));

  it("custom reasons with one missing", () =>
    expect(priceOrder(catalog, line("love-puzzle", { kind: "reasons", mode: "custom", reasons: twentyReasons.slice(0, 19) })).ok).toBe(false));
  it("a reason over the word limit", () =>
    expect(priceOrder(catalog, line("love-puzzle", { kind: "reasons", mode: "custom", reasons: [...twentyReasons.slice(1), "one two three four five six seven"] })).ok).toBe(false));
  it("standard reasons smuggling text in", () =>
    expect(priceOrder(catalog, line("love-puzzle", { kind: "reasons", mode: "standard", reasons: ["sneaky"] })).ok).toBe(false));

  it("a locket without a photo, or with two", () => {
    expect(priceOrder(catalog, line("locket", { kind: "photo", photoNames: [] })).ok).toBe(false);
    expect(priceOrder(catalog, line("locket", { kind: "photo", photoNames: ["a.jpg", "b.jpg"] })).ok).toBe(false);
  });
  it("a photo crop out of range", () =>
    expect(priceOrder(catalog, line("locket", { kind: "photo", photoNames: ["a.jpg"], crop: { zoom: 9, x: 0, y: 0 } })).ok).toBe(false));
  it("a file name with markup", () =>
    expect(priceOrder(catalog, line("locket", { kind: "photo", photoNames: ["<img src=x>.jpg"] })).ok).toBe(false));

  it("an NFC video over 100 MB", () =>
    expect(problems(priceOrder(catalog, line("nfc-tag", { kind: "video", source: "file", fileName: "us.mp4", sizeMb: 101 })))).toMatch(/100 MB/));
  it("an NFC link that isn't a web link", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.com/v.mp4", "not a link"])
      expect(priceOrder(catalog, line("nfc-tag", { kind: "video", source: "link", url })).ok).toBe(false);
  });
});

describe("toKobo", () => {
  it("converts whole naira", () => expect(toKobo(33000)).toBe(3_300_000));
  it("refuses fractions and negatives", () => {
    expect(() => toKobo(10.5)).toThrow();
    expect(() => toKobo(-1)).toThrow();
  });
});
