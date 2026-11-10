"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { reviewInput } from "@/lib/reviews";
import { currentStaff } from "@/lib/server/admin-session";
import { readCatalog } from "@/lib/server/catalog";
import { REVIEWS_TAG, addReview, deleteReview, moveReview, setReviewVisible, updateReview, type ReviewResult } from "@/lib/server/reviews";
import type { SignedInStaff } from "@/lib/server/staff";

/*
 * Review changes from the admin panel. Each checks the signed-in member of staff and its input itself,
 * then refreshes the shop's cached reviews so the change shows straight away.
 */

const reviewId = z.string().regex(/^[a-z0-9-]{1,64}$/);
const refused = (message: string): ReviewResult => ({ ok: false, message });

async function withStaff(run: (staff: SignedInStaff) => Promise<ReviewResult>): Promise<ReviewResult> {
  const staff = await currentStaff();
  if (!staff) return refused("Sign in again.");
  const result = await run(staff);
  if (result.ok) updateTag(REVIEWS_TAG);
  return result;
}

const productIds = async () => new Set((await readCatalog()).products.map((p) => p.id));
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form.";

export async function createReview(input: unknown): Promise<ReviewResult> {
  return withStaff(async (staff) => {
    const data = reviewInput.safeParse(input);
    if (!data.success) return refused(firstIssue(data.error));
    return addReview(staff, data.data, await productIds());
  });
}

export async function saveReview(id: string, input: unknown): Promise<ReviewResult> {
  return withStaff(async (staff) => {
    const rid = reviewId.safeParse(id);
    const data = reviewInput.safeParse(input);
    if (!rid.success) return refused("That review doesn't exist.");
    if (!data.success) return refused(firstIssue(data.error));
    return updateReview(staff, rid.data, data.data, await productIds());
  });
}

export async function showReview(id: string, visible: boolean): Promise<ReviewResult> {
  return withStaff(async (staff) => {
    const rid = reviewId.safeParse(id);
    if (!rid.success || typeof visible !== "boolean") return refused("That review doesn't exist.");
    return setReviewVisible(staff, rid.data, visible);
  });
}

export async function removeReview(id: string): Promise<ReviewResult> {
  return withStaff(async (staff) => {
    const rid = reviewId.safeParse(id);
    if (!rid.success) return refused("That review doesn't exist.");
    return deleteReview(staff, rid.data);
  });
}

export async function reorderReview(id: string, direction: "up" | "down"): Promise<ReviewResult> {
  return withStaff(async (staff) => {
    const rid = reviewId.safeParse(id);
    const dir = z.enum(["up", "down"]).safeParse(direction);
    if (!rid.success || !dir.success) return refused("That review doesn't exist.");
    return moveReview(staff, rid.data, dir.data);
  });
}
