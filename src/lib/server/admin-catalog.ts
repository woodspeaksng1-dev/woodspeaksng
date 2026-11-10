import "server-only";
import { z } from "zod";
import { formatNaira } from "@/lib/format";
import type { Personalization, Product, ShippingZone } from "@/lib/types";
import { db } from "./firebase";
import type { SignedInStaff } from "./staff";

/*
 * Catalog changes from the admin panel: products, delivery areas and making time. Each is validated
 * here (the browser's checks are only for feedback), made in a transaction and logged. The server
 * action that calls these then refreshes the shop's cached catalog (updateTag), so the site changes at once.
 */

export const HOME_FEATURED_MAX = 6;

const occasion = z.enum(["birthday", "anniversary", "corporate", "wedding", "just-because"]);
const recipient = z.enum(["for-him", "for-her", "couples", "clients"]);
const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`);
const whole = (min: number, max: number, what: string) =>
  z.number({ error: `Enter ${what}.` }).int(`Enter ${what} as a whole number.`).min(min, `${what} can't be below ${min}.`).max(max, `${what} can't be above ${max}.`);

/** Personalisation limits staff may change. The kind of personalisation itself is fixed per product. */
const limits = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("letter"), maxWords: whole(10, 1000, "the word limit") }),
  z.object({
    kind: z.literal("reasons"),
    count: whole(1, 50, "the number of reasons"),
    maxWordsEach: whole(1, 20, "the words per reason"),
    fee: whole(0, 1_000_000, "the fee"),
  }),
  z.object({ kind: z.literal("photo"), maxPhotos: whole(1, 10, "the number of photos") }),
  z.object({ kind: z.literal("video"), maxMb: whole(1, 500, "the largest video size") }),
]);

export const productInput = z.object({
  name: z.string().trim().min(2, "Give the product a name.").max(80, "Keep the name under 80 characters."),
  price: whole(1, 10_000_000, "the price"),
  description: z.string().trim().min(1, "Add a short description.").max(600, "Keep the description under 600 characters."),
  dimensions: text(120),
  included: text(200),
  occasions: z.array(occasion).max(5),
  recipients: z.array(recipient).max(4),
  personalization: limits,
  featured: z.boolean(),
  hidden: z.boolean(),
  addOn: z.boolean(),
  perishable: z.boolean(),
  seoTitle: text(70),
  imageAlt: text(200),
});
export type ProductInput = z.infer<typeof productInput>;

export type CatalogResult = { ok: true; message: string } | { ok: false; message: string };

const audit = (staff: SignedInStaff, action: string, target: string) => ({ at: new Date().toISOString(), by: staff.email, action, target });

/** A readable list of what changed, for the activity log. */
function describeChanges(before: Product, after: ProductInput): string {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`name to "${after.name}"`);
  if (before.price !== after.price) changes.push(`price ${formatNaira(before.price)} → ${formatNaira(after.price)}`);
  if (!!before.hidden !== after.hidden) changes.push(after.hidden ? "hidden from the shop" : "shown in the shop");
  if (!!before.featured !== after.featured) changes.push(after.featured ? "added to the home page" : "taken off the home page");
  const other = (["description", "dimensions", "included", "occasions", "recipients", "personalization", "addOn", "perishable", "seoTitle", "imageAlt"] as const).filter(
    (k) => JSON.stringify(before[k] ?? (typeof after[k] === "boolean" ? false : "")) !== JSON.stringify(after[k]),
  );
  if (other.length) changes.push(`${other.join(", ")} edited`);
  return changes.join("; ") || "no changes";
}

export async function updateProduct(staff: SignedInStaff, id: string, input: ProductInput): Promise<CatalogResult> {
  const products = db().collection("products");
  return db().runTransaction<CatalogResult>(async (t) => {
    const ref = products.doc(id);
    const snap = await t.get(ref);
    if (!snap.exists) return { ok: false, message: "That product doesn't exist." };
    const before = { ...(snap.data() as Product), id };
    if (before.personalization.kind !== input.personalization.kind)
      return { ok: false, message: "The kind of personalisation can't be changed here." };
    if (input.featured && !before.featured) {
      const featured = await t.get(products.where("featured", "==", true));
      if (featured.size >= HOME_FEATURED_MAX)
        return { ok: false, message: `The home page shows ${HOME_FEATURED_MAX} products. Take one off first.` };
    }
    const summary = describeChanges(before, input);
    if (summary === "no changes") return { ok: true, message: "No changes to save." };
    const update: Partial<Product> & { updatedAt: string } = { ...input, personalization: input.personalization as Personalization, updatedAt: new Date().toISOString() };
    t.update(ref, update);
    t.create(db().collection("auditLog").doc(), audit(staff, `edited ${input.name}:`, summary));
    return { ok: true, message: "Saved. The shop shows the change now." };
  });
}

// --- Delivery ---

export const zoneInput = z.object({
  name: z.string().trim().min(2, "Name the area.").max(60, "Keep the area name under 60 characters."),
  fee: whole(0, 1_000_000, "the fee"),
  estimate: text(60),
  perishables: z.boolean(),
});
export type ZoneInput = z.infer<typeof zoneInput>;

const zones = () => db().collection("shippingZones");
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

export async function updateZone(staff: SignedInStaff, id: string, input: ZoneInput): Promise<CatalogResult> {
  return db().runTransaction<CatalogResult>(async (t) => {
    const ref = zones().doc(id);
    const snap = await t.get(ref);
    if (!snap.exists) return { ok: false, message: "That area doesn't exist." };
    const before = snap.data() as ShippingZone;
    t.update(ref, { name: input.name, fee: input.fee, estimate: input.estimate || null, perishables: input.perishables, updatedAt: new Date().toISOString() });
    const what = before.fee !== input.fee ? `fee ${formatNaira(before.fee ?? 0)} → ${formatNaira(input.fee)}` : "details edited";
    t.create(db().collection("auditLog").doc(), audit(staff, `delivery ${input.name}:`, what));
    return { ok: true, message: `Saved. Checkout charges ${formatNaira(input.fee)} for ${input.name}.` };
  });
}

export async function addZone(staff: SignedInStaff, input: ZoneInput): Promise<CatalogResult> {
  const id = slugify(input.name);
  if (!id) return { ok: false, message: "Name the area with letters or numbers." };
  return db().runTransaction<CatalogResult>(async (t) => {
    const ref = zones().doc(id);
    if ((await t.get(ref)).exists) return { ok: false, message: "There's already an area with that name." };
    const all = await t.get(zones());
    const sortOrder = all.size;
    t.create(ref, { id, name: input.name, fee: input.fee, estimate: input.estimate || null, perishables: input.perishables, sortOrder, updatedAt: new Date().toISOString() });
    t.create(db().collection("auditLog").doc(), audit(staff, "added delivery area", `${input.name} (${formatNaira(input.fee)})`));
    return { ok: true, message: `Added ${input.name}.` };
  });
}

export async function removeZone(staff: SignedInStaff, id: string): Promise<CatalogResult> {
  return db().runTransaction<CatalogResult>(async (t) => {
    const ref = zones().doc(id);
    const snap = await t.get(ref);
    if (!snap.exists) return { ok: false, message: "That area doesn't exist." };
    const all = await t.get(zones());
    if (all.size <= 1) return { ok: false, message: "Keep at least one delivery area." };
    // Past orders keep their own copy of the area name and fee, so removing it doesn't change them.
    t.delete(ref);
    t.create(db().collection("auditLog").doc(), audit(staff, "removed delivery area", (snap.data() as ShippingZone).name));
    return { ok: true, message: `Removed ${(snap.data() as ShippingZone).name}.` };
  });
}

export async function setCraftingDays(staff: SignedInStaff, days: number): Promise<CatalogResult> {
  const parsed = whole(0, 30, "the number of days").safeParse(days);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const ref = db().doc("settings/shop");
  await db().runTransaction(async (t) => {
    const before = (await t.get(ref)).get("craftingDays");
    t.set(ref, { craftingDays: parsed.data }, { merge: true });
    t.create(db().collection("auditLog").doc(), audit(staff, "crafting time", `${before ?? "?"} → ${parsed.data} days`));
  });
  return { ok: true, message: `Saved. The earliest delivery date is now ${parsed.data} days after ordering.` };
}
