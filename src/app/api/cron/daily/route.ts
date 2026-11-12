import { timingSafeEqual } from "node:crypto";
import { lagosToday } from "@/lib/reminders";
import { SITE } from "@/lib/site";
import { alertTeam } from "@/lib/server/alerts";
import { runBroadcasts } from "@/lib/server/broadcasts";
import { recoverOrders } from "@/lib/server/order-recovery";
import { sendDueReminders } from "@/lib/server/reminders";
import { deleteUnusedUploads, uploadsEnabled } from "@/lib/server/uploads";

/*
 * Daily job (vercel.json → crons, 07:00 UTC = 08:00 in Lagos): first the orders' safety net (payments we
 * never heard about, order emails that didn't send), then the yearly gift reminders that are due, then the
 * next batch of any customer email still going out, then deletes uploads no paid order used. Vercel calls it with
 * `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */

export const maxDuration = 60;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ message: "Not allowed." }, { status: 401 });
  const started = Date.now();
  const today = lagosToday();
  // Short retries here: the job has a minute in all, and tomorrow's run tries again.
  const orders = await recoverOrders(SITE.url, new Date(), [0, 1500]).catch((error) => {
    console.error("Daily job: order checks failed.", error);
    return null;
  });
  const reminders = await sendDueReminders(today, SITE.url); // not request.url: Vercel calls this on an internal address
  const broadcasts = await runBroadcasts({ today, deadline: started + 50_000 });
  const uploadsDeleted = uploadsEnabled()
    ? await deleteUnusedUploads().catch((error) => (console.error("Daily job: upload clean-up failed.", error), 0))
    : 0;
  const result = { orders, reminders, broadcasts, uploadsDeleted };
  console.log("Daily job:", JSON.stringify(result));
  const problems = [
    !orders && "The check for unconfirmed payments and unsent order emails couldn't run.",
    orders?.emailsStillFailing && `${orders.emailsStillFailing} paid order(s) still have an email that won't send.`,
    reminders.failed && `${reminders.failed} gift reminder email(s) failed.`,
    broadcasts.failed && `${broadcasts.failed} customer update email(s) failed.`,
  ].filter(Boolean);
  if (problems.length) await alertTeam("daily-job", "the daily job had problems", problems.join("\n"));
  return Response.json(result);
}
