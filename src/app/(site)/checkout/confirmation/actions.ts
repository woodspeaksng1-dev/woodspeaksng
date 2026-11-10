"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { lagosToday } from "@/lib/reminders";
import { allow, clientIp } from "@/lib/server/rate-limit";
import { remindForOrder } from "@/lib/server/reminders";

/**
 * "Remind me next year" on the confirmation page. The reminder goes to the order's own buyer (looked up on
 * the server), and only for a paid order, so knowing an order number lets you do nothing more than the buyer
 * asked for on that page. Next refuses calls from other sites; we also limit calls per visitor.
 */
export async function remindNextYear(orderNumber: string): Promise<{ ok: boolean; message: string; nextOccasion?: string }> {
  const parsed = z.string().regex(/^WS-[A-Z0-9]{6,12}$/).safeParse(orderNumber);
  if (!parsed.success) return { ok: false, message: "We couldn't find that order." };
  if (!(await allow("reminder-ip", clientIp(await headers()), 20, 3600))) return { ok: false, message: "Too many tries. Try again later." };
  try {
    return await remindForOrder(parsed.data, lagosToday());
  } catch (error) {
    console.error(`Reminder for ${parsed.data} failed.`, error);
    return { ok: false, message: "We couldn't set that just now. Try again in a moment." };
  }
}
