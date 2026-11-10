import "server-only";
import { randomUUID } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { StoredOrder } from "@/lib/orders";
import { REVIEW_SOURCES, SEED_REVIEWS, reviewInput, type Review, type ReviewSource } from "@/lib/reviews";
import { logActivity } from "./admin-activity";
import { withTimeout } from "./catalog";
import { db } from "./firebase";
import type { SignedInStaff } from "./staff";

/*
 * Reviews in Firestore `reviews/{id}`. Shoppers get the visible ones from a cache (tag REVIEWS_TAG) that
 * admin changes refresh straight away; if Firestore can't be read in time they see the six from the old
 * site. Every document is checked against the schema; a broken one is logged and skipped.
 */

export const REVIEWS_TAG = "reviews";
export type ReviewResult = { ok: boolean; message: string };

const reviews = () => db().collection("reviews");

const reviewSchema: z.ZodType<Review> = z.object({
  id: z.string().min(1),
  quote: z.string().min(1),
  who: z.string().min(1),
  productId: z.string().nullable(),
  role: z.string().nullable(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
  orderNumber: z.string().nullable(),
  verified: z.boolean(),
  source: z.enum(Object.keys(REVIEW_SOURCES) as [ReviewSource, ...ReviewSource[]]),
  visible: z.boolean(),
  sortOrder: z.number(),
});

/** Every review, in display order. Uncached; admin uses this. */
export async function readReviews(): Promise<Review[]> {
  const snap = await reviews().orderBy("sortOrder").get();
  return snap.docs.flatMap((d) => {
    const parsed = reviewSchema.safeParse(d.data());
    if (parsed.success) return [parsed.data];
    console.error(`Review ${d.id} is malformed and was skipped.`, parsed.error.issues[0]);
    return [];
  });
}

/** What shoppers see: visible reviews, in order. */
export async function getPublicReviews(): Promise<Review[]> {
  "use cache";
  cacheTag(REVIEWS_TAG);
  try {
    const all = await withTimeout(readReviews(), 8000);
    cacheLife("hours");
    return all.filter((r) => r.visible);
  } catch (error) {
    console.error("Reviews: Firestore read failed, showing the old site's reviews.", error);
    cacheLife("minutes");
    return SEED_REVIEWS;
  }
}

type Fields = Omit<Review, "id" | "sortOrder">;

/**
 * Turns the admin form into stored fields. An order number must be a paid order; it marks the review
 * "Verified order" when the order includes the product the review is about (or the review names none).
 */
async function toFields(input: z.output<typeof reviewInput>, productIds: Set<string>): Promise<Fields | ReviewResult> {
  if (input.productId && !productIds.has(input.productId)) return { ok: false, message: "Choose a product from the list." };
  let verified = false;
  if (input.orderNumber) {
    const order = (await db().collection("orders").doc(input.orderNumber).get()).data() as StoredOrder | undefined;
    if (!order || order.status === "pending" || order.status === "cancelled")
      return { ok: false, message: `There's no paid order ${input.orderNumber}. Check the number, or leave it empty.` };
    if (input.productId && !order.lines.some((l) => l.productId === input.productId))
      return { ok: false, message: `Order ${input.orderNumber} didn't include that product.` };
    verified = true;
  }
  return {
    quote: input.quote,
    who: input.who,
    productId: input.productId,
    role: input.role,
    rating: input.rating,
    orderNumber: input.orderNumber,
    verified,
    source: input.source,
    visible: input.visible,
  };
}

const isResult = (v: Fields | ReviewResult): v is ReviewResult => "ok" in v;

export async function addReview(staff: SignedInStaff, input: z.output<typeof reviewInput>, productIds: Set<string>): Promise<ReviewResult> {
  const fields = await toFields(input, productIds);
  if (isResult(fields)) return fields;
  const id = randomUUID();
  await db().runTransaction(async (t) => {
    const last = await t.get(reviews().orderBy("sortOrder", "desc").limit(1));
    const sortOrder = last.empty ? 0 : (last.docs[0].get("sortOrder") as number) + 1;
    t.create(reviews().doc(id), { ...fields, id, sortOrder, createdAt: new Date().toISOString(), createdBy: staff.email });
  });
  await logActivity(staff.email, "Added review", fields.who);
  return { ok: true, message: fields.visible ? "Review added. It's on the site now." : "Review added, hidden for now." };
}

export async function updateReview(staff: SignedInStaff, id: string, input: z.output<typeof reviewInput>, productIds: Set<string>): Promise<ReviewResult> {
  const fields = await toFields(input, productIds);
  if (isResult(fields)) return fields;
  const ref = reviews().doc(id);
  const found = await db().runTransaction(async (t) => {
    if (!(await t.get(ref)).exists) return false;
    t.update(ref, { ...fields, updatedAt: new Date().toISOString(), updatedBy: staff.email });
    return true;
  });
  if (!found) return { ok: false, message: "That review doesn't exist." };
  await logActivity(staff.email, "Edited review", fields.who);
  return { ok: true, message: "Saved." };
}

export async function setReviewVisible(staff: SignedInStaff, id: string, visible: boolean): Promise<ReviewResult> {
  const ref = reviews().doc(id);
  const who = await db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return null;
    t.update(ref, { visible, updatedAt: new Date().toISOString(), updatedBy: staff.email });
    return snap.get("who") as string;
  });
  if (who === null) return { ok: false, message: "That review doesn't exist." };
  await logActivity(staff.email, visible ? "Showed review" : "Hid review", who);
  return { ok: true, message: visible ? "Shown on the site." : "Hidden from the site." };
}

export async function deleteReview(staff: SignedInStaff, id: string): Promise<ReviewResult> {
  const ref = reviews().doc(id);
  const who = await db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return null;
    t.delete(ref);
    return snap.get("who") as string;
  });
  if (who === null) return { ok: false, message: "That review doesn't exist." };
  await logActivity(staff.email, "Deleted review", who);
  return { ok: true, message: "Deleted." };
}

/** Swaps a review with its neighbour, so it shows one place earlier ("up") or later ("down"). */
export async function moveReview(staff: SignedInStaff, id: string, direction: "up" | "down"): Promise<ReviewResult> {
  const moved = await db().runTransaction(async (t) => {
    const all = (await t.get(reviews().orderBy("sortOrder"))).docs;
    const at = all.findIndex((d) => d.id === id);
    const other = all[direction === "up" ? at - 1 : at + 1];
    if (at < 0 || !other) return false;
    // Renumber everything so equal or missing sort orders can't make a swap do nothing.
    const order = all.map((d) => d.ref);
    [order[at], order[direction === "up" ? at - 1 : at + 1]] = [order[direction === "up" ? at - 1 : at + 1], order[at]];
    order.forEach((ref, i) => t.update(ref, { sortOrder: i }));
    return true;
  });
  if (!moved) return { ok: false, message: direction === "up" ? "It's already first." : "It's already last." };
  await logActivity(staff.email, "Reordered reviews", direction === "up" ? "moved one up" : "moved one down");
  return { ok: true, message: "Moved." };
}
