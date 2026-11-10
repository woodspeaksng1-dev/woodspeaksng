import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { SEED_CATALOG } from "@/lib/catalog";
import type { Catalog, Product, ShippingZone } from "@/lib/types";
import { db } from "./firebase";

/*
 * The live catalog, from Firestore: `products`, `shippingZones` and `settings/shop`.
 * - `getStorefront()` / `getCatalog()`: cached for an hour (tag CATALOG_TAG); admin edits call
 *   updateTag(CATALOG_TAG) so changes show at once. If Firestore can't be read within READ_TIMEOUT_MS they
 *   fall back to the starting catalog, cached for only a minute so the next visit tries Firestore again.
 *   Pages always render; never price from them.
 * - `readCatalog()`: uncached and strict (throws if Firestore fails). Order pricing uses this.
 * Every document is checked against the schema below; a broken one is logged and skipped.
 */

export const CATALOG_TAG = "catalog";
/** How long a shopper waits for Firestore before the page uses the starting catalog. */
const READ_TIMEOUT_MS = 8000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

const occasion = z.enum(["birthday", "anniversary", "corporate", "wedding", "just-because"]);
const recipient = z.enum(["for-him", "for-her", "couples", "clients"]);
const naira = z.number().int().nonnegative();

const personalization = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("letter"), maxWords: z.number().int().positive() }),
  z.object({
    kind: z.literal("reasons"),
    count: z.number().int().positive(),
    maxWordsEach: z.number().int().positive(),
    fee: naira,
  }),
  z.object({ kind: z.literal("photo"), maxPhotos: z.number().int().positive() }),
  z.object({ kind: z.literal("video"), maxMb: z.number().positive() }),
]);

const productSchema: z.ZodType<Product> = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  price: naira,
  category: z.enum(["scrolls", "keepsakes", "flowers-treats", "add-on"]),
  description: z.string(),
  occasions: z.array(occasion),
  recipients: z.array(recipient),
  personalization,
  perishable: z.boolean().optional(),
  featured: z.boolean().optional(),
  addOn: z.boolean().optional(),
  hidden: z.boolean().optional(),
  image: z.string().optional(),
  dimensions: z.string().optional(),
  included: z.string().optional(),
  seoTitle: z.string().optional(),
  imageAlt: z.string().optional(),
});

const zoneSchema: z.ZodType<ShippingZone> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fee: naira.nullable(),
  estimate: z.string().nullable(),
  perishables: z.boolean(),
});

function parseAll<T>(docs: FirebaseFirestore.QueryDocumentSnapshot[], schema: z.ZodType<T>, what: string): T[] {
  return docs.flatMap((d) => {
    const r = schema.safeParse({ ...d.data(), id: d.id });
    if (r.success) return [r.data];
    console.error(`Catalog: skipped ${what} ${d.id}: ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}`);
    return [];
  });
}

/** Straight from Firestore, every product including hidden ones. Throws if Firestore can't be read. */
export async function readCatalog(): Promise<Catalog> {
  const [products, zones, settings] = await Promise.all([
    db().collection("products").orderBy("sortOrder").get(),
    db().collection("shippingZones").orderBy("sortOrder").get(),
    db().doc("settings/shop").get(),
  ]);
  const craftingDays = z.number().int().min(0).max(60).safeParse(settings.get("craftingDays"));
  return {
    products: parseAll(products.docs, productSchema, "product"),
    zones: parseAll(zones.docs, zoneSchema, "zone"),
    craftingDays: craftingDays.success ? craftingDays.data : SEED_CATALOG.craftingDays,
  };
}

/** Cached catalog, hidden products included (admin, order history). */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  try {
    const catalog = await withTimeout(readCatalog(), READ_TIMEOUT_MS);
    cacheLife("hours");
    return catalog;
  } catch (error) {
    console.error("Catalog: Firestore read failed, showing the starting catalog.", error);
    cacheLife("minutes"); // try Firestore again on the next visit after a minute
    return SEED_CATALOG;
  }
}

/** What shoppers see: the cached catalog without hidden products. */
export async function getStorefront(): Promise<Catalog> {
  const catalog = await getCatalog();
  return { ...catalog, products: catalog.products.filter((p) => !p.hidden) };
}
