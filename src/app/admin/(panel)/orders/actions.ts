"use server";

import { after } from "next/server";
import { z } from "zod";
import { STATUS_FLOW, STATUS_LABEL } from "@/lib/orders";
import { advanceOrder, markNfcWritten } from "@/lib/server/admin-orders";
import { currentStaff } from "@/lib/server/admin-session";
import { sendDispatchedEmail } from "@/lib/server/order-emails";

/*
 * Order changes from the admin panel. Server Actions can be called directly, so each one checks the
 * signed-in member of staff and its input itself (Next also refuses calls from other sites).
 */

export type ActionResult = { ok: boolean; message: string };

const orderNumber = z.string().regex(/^WS-[A-Z0-9]{6,12}$/);

export async function moveOrderOn(number: string, to: string): Promise<ActionResult> {
  const staff = await currentStaff();
  if (!staff) return { ok: false, message: "Sign in again." };
  const input = z.object({ number: orderNumber, to: z.enum(STATUS_FLOW) }).safeParse({ number, to });
  if (!input.success) return { ok: false, message: "That change isn't allowed." };

  const result = await advanceOrder(staff, input.data.number, input.data.to);
  if (!result.ok) return result;
  if (input.data.to === "dispatched") {
    const order = result.order;
    after(() => sendDispatchedEmail(order));
    return { ok: true, message: "Marked dispatched. The customer has been emailed." };
  }
  return { ok: true, message: `Marked ${STATUS_LABEL[input.data.to].toLowerCase()}.` };
}

export async function nfcWritten(number: string): Promise<ActionResult> {
  const staff = await currentStaff();
  if (!staff) return { ok: false, message: "Sign in again." };
  const input = orderNumber.safeParse(number);
  if (!input.success) return { ok: false, message: "That order doesn't exist." };
  const result = await markNfcWritten(staff, input.data);
  return { ok: result.ok, message: result.message };
}
