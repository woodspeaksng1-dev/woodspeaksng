"use server";

import { z } from "zod";
import { currentStaff } from "@/lib/server/admin-session";
import { setEnquiryHandled } from "@/lib/server/enquiries";

/** Marks an enquiry handled (or back to new). Checks the signed-in member of staff and the input itself. */
export async function markEnquiry(id: string, handled: boolean): Promise<{ ok: boolean; message: string }> {
  const staff = await currentStaff();
  if (!staff) return { ok: false, message: "Sign in again." };
  const input = z.object({ id: z.uuid(), handled: z.boolean() }).safeParse({ id, handled });
  if (!input.success) return { ok: false, message: "That enquiry doesn't exist." };
  return setEnquiryHandled(staff.email, input.data.id, input.data.handled);
}
