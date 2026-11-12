import "server-only";
import { randomUUID } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { BUILT_IN_MOMENTS, momentInput, type Moment } from "@/lib/gallery";
import { logActivity } from "./admin-activity";
import { withTimeout } from "./catalog";
import { db } from "./firebase";
import { deletePhoto, storePhoto } from "./product-photos";
import type { SignedInStaff } from "./staff";

/*
 * Customer moments in Firestore `moments/{id}`. Shoppers get the visible ones from a cache (tag MOMENTS_TAG)
 * that admin changes refresh straight away. Until admin first opens Moments (which loads the four the site
 * started with and sets settings/shop.momentsLoaded), and whenever Firestore can't be read in time, shoppers
 * see those four. Photos are stored privately like product photos and served from /catalog-photo.
 */

export const MOMENTS_TAG = "moments";
export type MomentResult = { ok: boolean; message: string };

const moments = () => db().collection("moments");
const settings = () => db().doc("settings/shop");

const momentSchema: z.ZodType<Moment> = z.object({
  id: z.string().min(1),
  caption: z.string().min(1),
  who: z.string().nullable(),
  productSlug: z.string().nullable(),
  image: z.string().nullable(),
  visible: z.boolean(),
  sortOrder: z.number(),
});

async function readStored(): Promise<Moment[]> {
  const snap = await moments().orderBy("sortOrder").get();
  return snap.docs.flatMap((d) => {
    const parsed = momentSchema.safeParse(d.data());
    if (parsed.success) return [parsed.data];
    console.error(`Moment ${d.id} is malformed and was skipped.`, parsed.error.issues[0]);
    return [];
  });
}

/** Every moment, in order, for admin. Loads the four built-in moments the first time. Uncached. */
export async function readMoments(): Promise<Moment[]> {
  const ref = settings();
  await db().runTransaction(async (t) => {
    if ((await t.get(ref)).get("momentsLoaded")) return;
    for (const m of BUILT_IN_MOMENTS) t.set(moments().doc(m.id), { ...m, createdAt: new Date().toISOString(), createdBy: "built in" });
    t.set(ref, { momentsLoaded: true }, { merge: true });
  });
  return readStored();
}

/** What shoppers see: visible moments, in order. */
export async function getPublicMoments(): Promise<Moment[]> {
  "use cache";
  cacheTag(MOMENTS_TAG);
  try {
    const all = await withTimeout(
      (async () => ((await settings().get()).get("momentsLoaded") ? readStored() : BUILT_IN_MOMENTS))(),
      8000,
    );
    cacheLife("hours");
    return all.filter((m) => m.visible);
  } catch (error) {
    console.error("Moments: Firestore read failed, showing the built-in moments.", error);
    cacheLife("minutes");
    return BUILT_IN_MOMENTS;
  }
}

type Input = z.output<typeof momentInput>;

const checkProduct = (input: Input, productSlugs: Set<string>): MomentResult | null =>
  input.productSlug && !productSlugs.has(input.productSlug) ? { ok: false, message: "Choose a product from the list." } : null;

/** A new moment with its photo, put first so it leads the home page. */
export async function addMoment(staff: SignedInStaff, input: Input, photo: Uint8Array, productSlugs: Set<string>): Promise<MomentResult> {
  const refused = checkProduct(input, productSlugs);
  if (refused) return refused;
  await readMoments(); // make sure the built-in four are there, so the new one goes in front of them
  const stored = await storePhoto(photo, "moment");
  if (!stored.ok) return stored;
  const id = randomUUID();
  try {
    await saveNew(staff, id, input, stored.image);
  } catch (error) {
    await deletePhoto(stored.image); // don't leave an unused photo in the bucket
    throw error;
  }
  await logActivity(staff.email, "Added moment", input.caption);
  return { ok: true, message: "Added. It's first on the home page now." };
}

function saveNew(staff: SignedInStaff, id: string, input: Input, image: string) {
  return db().runTransaction(async (t) => {
    const first = await t.get(moments().orderBy("sortOrder").limit(1));
    const sortOrder = first.empty ? 0 : (first.docs[0].get("sortOrder") as number) - 1;
    t.create(moments().doc(id), {
      id,
      caption: input.caption,
      who: input.who,
      productSlug: input.productSlug,
      image,
      visible: true,
      sortOrder,
      consent: true,
      createdAt: new Date().toISOString(),
      createdBy: staff.email,
    });
  });
}

export async function updateMoment(staff: SignedInStaff, id: string, input: Input, productSlugs: Set<string>): Promise<MomentResult> {
  const refused = checkProduct(input, productSlugs);
  if (refused) return refused;
  const ref = moments().doc(id);
  const found = await db().runTransaction(async (t) => {
    if (!(await t.get(ref)).exists) return false;
    t.update(ref, { caption: input.caption, who: input.who, productSlug: input.productSlug, updatedAt: new Date().toISOString(), updatedBy: staff.email });
    return true;
  });
  if (!found) return { ok: false, message: "That moment doesn't exist." };
  await logActivity(staff.email, "Edited moment", input.caption);
  return { ok: true, message: "Saved." };
}

export async function setMomentVisible(staff: SignedInStaff, id: string, visible: boolean): Promise<MomentResult> {
  const ref = moments().doc(id);
  const caption = await db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return null;
    t.update(ref, { visible, updatedAt: new Date().toISOString(), updatedBy: staff.email });
    return snap.get("caption") as string;
  });
  if (caption === null) return { ok: false, message: "That moment doesn't exist." };
  await logActivity(staff.email, visible ? "Showed moment" : "Hid moment", caption);
  return { ok: true, message: visible ? "Shown on the site." : "Hidden from the site." };
}

/** Deletes a moment and, if it was uploaded in admin, its photo. */
export async function deleteMoment(staff: SignedInStaff, id: string): Promise<MomentResult> {
  const ref = moments().doc(id);
  const gone = await db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return null;
    t.delete(ref);
    return { caption: snap.get("caption") as string, image: snap.get("image") as string | null };
  });
  if (!gone) return { ok: false, message: "That moment doesn't exist." };
  await deletePhoto(gone.image);
  await logActivity(staff.email, "Deleted moment", gone.caption);
  return { ok: true, message: "Deleted." };
}

/** Swaps a moment with its neighbour, so it shows one place earlier ("up") or later ("down"). */
export async function moveMoment(staff: SignedInStaff, id: string, direction: "up" | "down"): Promise<MomentResult> {
  const moved = await db().runTransaction(async (t) => {
    const all = (await t.get(moments().orderBy("sortOrder"))).docs;
    const at = all.findIndex((d) => d.id === id);
    const to = direction === "up" ? at - 1 : at + 1;
    if (at < 0 || !all[to]) return false;
    // Renumber everything so equal or missing sort orders can't make a swap do nothing.
    const order = all.map((d) => d.ref);
    [order[at], order[to]] = [order[to], order[at]];
    order.forEach((ref, i) => t.update(ref, { sortOrder: i }));
    return true;
  });
  if (!moved) return { ok: false, message: direction === "up" ? "It's already first." : "It's already last." };
  await logActivity(staff.email, "Reordered moments", direction === "up" ? "moved one up" : "moved one down");
  return { ok: true, message: "Moved." };
}
