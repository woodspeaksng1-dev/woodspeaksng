"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { broadcastInput, renderBroadcast } from "@/lib/broadcast";
import { lagosToday } from "@/lib/reminders";
import { currentStaff } from "@/lib/server/admin-session";
import { deleteDraft, queueBroadcast, runBroadcasts, saveDraft, sendTest, type BroadcastResult } from "@/lib/server/broadcasts";

/*
 * Customer emails from the admin panel. Each action checks the signed-in member of staff and its input
 * itself. Links in the emails use the address the admin is on, so they point at the live site.
 */

const draftId = z.uuid();
const refused = (message: string): BroadcastResult => ({ ok: false, message });
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the email.";

async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** How the email looks, for the preview. Rendered by the same template the real emails use. */
export async function previewEmail(input: unknown): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  if (!(await currentStaff())) return { ok: false, message: "Sign in again." };
  const data = broadcastInput.safeParse(input);
  if (!data.success) return { ok: false, message: firstIssue(data.error) };
  const url = await siteUrl();
  return { ok: true, html: renderBroadcast(data.data, { siteUrl: url, unsubscribeUrl: `${url}/emails/unsubscribe` }).html };
}

export async function saveEmailDraft(id: string | null, input: unknown): Promise<BroadcastResult & { id?: string }> {
  const staff = await currentStaff();
  if (!staff) return refused("Sign in again.");
  if (id !== null && !draftId.safeParse(id).success) return refused("That draft doesn't exist.");
  const data = broadcastInput.safeParse(input);
  if (!data.success) return refused(firstIssue(data.error));
  return saveDraft(staff, id, data.data);
}

export async function deleteEmailDraft(id: string): Promise<BroadcastResult> {
  const staff = await currentStaff();
  if (!staff) return refused("Sign in again.");
  if (!draftId.safeParse(id).success) return refused("That draft doesn't exist.");
  return deleteDraft(staff, id);
}

export async function sendTestEmail(id: string): Promise<BroadcastResult> {
  const staff = await currentStaff();
  if (!staff) return refused("Sign in again.");
  if (!draftId.safeParse(id).success) return refused("That draft doesn't exist.");
  return sendTest(staff, id, await siteUrl());
}

/** Owner only (checked in queueBroadcast). Starts sending at once; the daily job carries on with the rest. */
export async function sendToEveryone(id: string): Promise<BroadcastResult> {
  const staff = await currentStaff();
  if (!staff) return refused("Sign in again.");
  if (!draftId.safeParse(id).success) return refused("That draft doesn't exist.");
  const result = await queueBroadcast(staff, id, await siteUrl());
  if (result.ok) {
    const started = Date.now();
    after(() => runBroadcasts({ today: lagosToday(), deadline: started + 45_000 }).catch((error) => console.error("Broadcast run failed.", error)));
  }
  return result;
}
