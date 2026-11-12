"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { momentInput } from "@/lib/gallery";
import { currentStaff } from "@/lib/server/admin-session";
import { readCatalog } from "@/lib/server/catalog";
import { MOMENTS_TAG, deleteMoment, moveMoment, setMomentVisible, updateMoment, type MomentResult } from "@/lib/server/moments";
import type { SignedInStaff } from "@/lib/server/staff";

/*
 * Moment changes from the admin panel (adding one, with its photo, is the /api/admin/moments route).
 * Each checks the signed-in member of staff and its input itself, then refreshes the shop's moments.
 */

const momentId = z.string().regex(/^[a-z0-9-]{1,64}$/);
const refused = (message: string): MomentResult => ({ ok: false, message });

async function withStaff(run: (staff: SignedInStaff) => Promise<MomentResult>): Promise<MomentResult> {
  const staff = await currentStaff();
  if (!staff) return refused("Sign in again.");
  const result = await run(staff);
  if (result.ok) updateTag(MOMENTS_TAG);
  return result;
}

const productSlugs = async () => new Set((await readCatalog()).products.map((p) => p.slug));

export async function saveMoment(id: string, input: unknown): Promise<MomentResult> {
  return withStaff(async (staff) => {
    const mid = momentId.safeParse(id);
    const data = momentInput.safeParse(input);
    if (!mid.success) return refused("That moment doesn't exist.");
    if (!data.success) return refused(data.error.issues[0]?.message ?? "Check the form.");
    return updateMoment(staff, mid.data, data.data, await productSlugs());
  });
}

export async function showMoment(id: string, visible: boolean): Promise<MomentResult> {
  return withStaff(async (staff) => {
    const mid = momentId.safeParse(id);
    if (!mid.success || typeof visible !== "boolean") return refused("That moment doesn't exist.");
    return setMomentVisible(staff, mid.data, visible);
  });
}

export async function removeMoment(id: string): Promise<MomentResult> {
  return withStaff(async (staff) => {
    const mid = momentId.safeParse(id);
    if (!mid.success) return refused("That moment doesn't exist.");
    return deleteMoment(staff, mid.data);
  });
}

export async function reorderMoment(id: string, direction: "up" | "down"): Promise<MomentResult> {
  return withStaff(async (staff) => {
    const mid = momentId.safeParse(id);
    const dir = z.enum(["up", "down"]).safeParse(direction);
    if (!mid.success || !dir.success) return refused("That moment doesn't exist.");
    return moveMoment(staff, mid.data, dir.data);
  });
}
