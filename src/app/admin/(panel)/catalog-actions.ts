"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import {
  addZone,
  productInput,
  removeZone,
  setCraftingDays,
  updateProduct,
  updateZone,
  zoneInput,
  type CatalogResult,
} from "@/lib/server/admin-catalog";
import { currentStaff } from "@/lib/server/admin-session";
import { CATALOG_TAG } from "@/lib/server/catalog";

/*
 * Product and delivery changes from the admin panel. Each checks the signed-in member of staff and
 * validates its input itself (Server Actions can be called directly), then refreshes the shop's cached
 * catalog so customers see the change straight away.
 */

const id = z.string().regex(/^[a-z0-9-]{1,64}$/);
const refused = (message: string): CatalogResult => ({ ok: false, message });

async function withStaff(run: (staff: NonNullable<Awaited<ReturnType<typeof currentStaff>>>) => Promise<CatalogResult>) {
  const staff = await currentStaff();
  if (!staff) return refused("Sign in again.");
  const result = await run(staff);
  if (result.ok) updateTag(CATALOG_TAG);
  return result;
}

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form.";

export async function saveProduct(productId: string, input: unknown): Promise<CatalogResult> {
  return withStaff(async (staff) => {
    const pid = id.safeParse(productId);
    const data = productInput.safeParse(input);
    if (!pid.success) return refused("That product doesn't exist.");
    if (!data.success) return refused(firstIssue(data.error));
    return updateProduct(staff, pid.data, data.data);
  });
}

export async function saveZone(zoneId: string, input: unknown): Promise<CatalogResult> {
  return withStaff(async (staff) => {
    const zid = id.safeParse(zoneId);
    const data = zoneInput.safeParse(input);
    if (!zid.success) return refused("That area doesn't exist.");
    if (!data.success) return refused(firstIssue(data.error));
    return updateZone(staff, zid.data, data.data);
  });
}

export async function createZone(input: unknown): Promise<CatalogResult> {
  return withStaff(async (staff) => {
    const data = zoneInput.safeParse(input);
    if (!data.success) return refused(firstIssue(data.error));
    return addZone(staff, data.data);
  });
}

export async function deleteZone(zoneId: string): Promise<CatalogResult> {
  return withStaff(async (staff) => {
    const zid = id.safeParse(zoneId);
    if (!zid.success) return refused("That area doesn't exist.");
    return removeZone(staff, zid.data);
  });
}

export async function saveCraftingDays(days: unknown): Promise<CatalogResult> {
  return withStaff((staff) => setCraftingDays(staff, typeof days === "number" ? days : Number.NaN));
}
