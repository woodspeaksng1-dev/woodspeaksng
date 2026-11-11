import { z } from "zod";
import { findProduct, findZone } from "./catalog";
import { unitPrice } from "./pricing";
import type { CartCustomization, Catalog, Product, ShippingZone } from "./types";
import { uploadId } from "./uploads";
import { letterSchema, reasonsSchema, videoLinkSchema } from "./validation";

/*
 * Prices an order on the server. The browser sends only what's in the cart: product IDs, quantities and
 * personalisation. Prices, fees and totals come from the catalog the server read itself (`readCatalog()`),
 * never from the browser; anything else the browser sends is dropped. Every line is checked against its
 * product: it must exist and be on sale, the personalisation must be the product's kind and within its
 * limits, and fresh items must go to an area that takes them.
 * Pure (no Firestore) so it can be tested directly; the checkout route passes in the live catalog.
 */

export const MAX_LINES = 30;
export const MAX_QUANTITY = 20;

/** What the browser may send for one cart line. Unknown fields (a price, a total…) are stripped. */
const cartLine = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
  customization: z.unknown(),
});

export const orderRequestSchema = z.object({
  lines: z.array(cartLine).min(1, "Your cart is empty.").max(MAX_LINES, `An order can have up to ${MAX_LINES} items.`),
  zoneId: z.string().min(1).max(64),
});
export type OrderRequest = z.input<typeof orderRequestSchema>;

/** A file name as the customer's device named it: shown to staff, so no markup or control characters. */
const fileName = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^<>\p{Cc}]+$/u, "That file name has characters we can't use.");

const crop = z.object({
  zoom: z.number().min(1).max(3),
  x: z.number().min(-100).max(100),
  y: z.number().min(-100).max(100),
});

/** The personalisation a product accepts, built from its own limits. */
function customizationSchema(product: Product): z.ZodType<CartCustomization> {
  const p = product.personalization;
  switch (p.kind) {
    case "none":
      return z.object({ kind: z.literal("none") });
    case "letter":
      return z.object({ kind: z.literal("letter"), text: letterSchema(p.maxWords) });
    case "reasons":
      return z.discriminatedUnion("mode", [
        z.object({ kind: z.literal("reasons"), mode: z.literal("standard"), reasons: z.array(z.string()).max(0).default([]) }),
        z.object({ kind: z.literal("reasons"), mode: z.literal("custom"), reasons: reasonsSchema(p.count, p.maxWordsEach) }),
      ]);
    case "photo":
      return z.object({
        kind: z.literal("photo"),
        photoNames: z.array(fileName).min(1, "Add a photo.").max(p.maxPhotos, `Up to ${p.maxPhotos} photo${p.maxPhotos === 1 ? "" : "s"}.`),
        crop: crop.optional(),
        uploadIds: z.array(uploadId).max(p.maxPhotos).optional(),
      });
    case "video":
      return z.discriminatedUnion("source", [
        z.object({
          kind: z.literal("video"),
          source: z.literal("file"),
          fileName,
          sizeMb: z.number().positive().max(p.maxMb, `Videos can be up to ${p.maxMb} MB.`),
          uploadId: uploadId.optional(),
        }),
        z.object({ kind: z.literal("video"), source: z.literal("link"), url: videoLinkSchema }),
      ]);
  }
}

export interface PricedLine {
  productId: string;
  /** Copied at the time of sale, so the order keeps them if the product changes later. */
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  customization: CartCustomization;
}

export interface PricedOrder {
  lines: PricedLine[];
  zone: ShippingZone;
  itemsTotal: number;
  /** null while the area's fee isn't set (the dispatch quote arrives later). */
  deliveryFee: number | null;
  /** Items plus delivery, in naira. Without a delivery fee it's the items only. */
  total: number;
}

export interface PricingProblem {
  /** Cart line index, or null for the whole order. */
  line: number | null;
  message: string;
}

export type PricingResult = { ok: true; order: PricedOrder } | { ok: false; problems: PricingProblem[] };

export function priceOrder(catalog: Catalog, request: unknown): PricingResult {
  const parsed = orderRequestSchema.safeParse(request);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.map((i) => ({
        line: i.path[0] === "lines" && typeof i.path[1] === "number" ? i.path[1] : null,
        message: i.message,
      })),
    };
  }

  const problems: PricingProblem[] = [];
  const zone = findZone(catalog, parsed.data.zoneId);
  if (!zone) problems.push({ line: null, message: "Choose a delivery area." });

  const lines: PricedLine[] = [];
  parsed.data.lines.forEach((line, index) => {
    const product = findProduct(catalog, line.productId);
    if (!product || product.hidden) {
      problems.push({ line: index, message: "This item is no longer available. Remove it from your cart." });
      return;
    }
    const custom = customizationSchema(product).safeParse(line.customization);
    if (!custom.success) {
      problems.push({ line: index, message: `${product.name}: ${custom.error.issues[0]?.message ?? "check the personalisation."}` });
      return;
    }
    if (product.perishable && zone && !zone.perishables) {
      problems.push({ line: index, message: `${product.name} is fresh, so we can only deliver it to some areas. Choose another area or remove it.` });
      return;
    }
    const unit = unitPrice(product, custom.data);
    lines.push({
      productId: product.id,
      name: product.name,
      unitPrice: unit,
      quantity: line.quantity,
      lineTotal: unit * line.quantity,
      customization: custom.data,
    });
  });

  if (problems.length || !zone) return { ok: false, problems };

  const itemsTotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  const deliveryFee = zone.fee;
  return { ok: true, order: { lines, zone, itemsTotal, deliveryFee, total: itemsTotal + (deliveryFee ?? 0) } };
}

/** Naira to kobo, the unit Paystack charges in. Whole numbers only. */
export function toKobo(naira: number): number {
  if (!Number.isSafeInteger(naira) || naira < 0) throw new Error(`Not a whole naira amount: ${naira}`);
  return naira * 100;
}
