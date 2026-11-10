import { timingSafeEqual } from "node:crypto";
import { lagosToday } from "@/lib/reminders";
import { runBroadcasts } from "@/lib/server/broadcasts";
import { sendDueReminders } from "@/lib/server/reminders";

/*
 * Daily job (vercel.json → crons, 07:00 UTC = 08:00 in Lagos): sends the yearly gift reminders that are due,
 * then the next batch of any customer email still going out. Vercel calls it with
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
  const reminders = await sendDueReminders(today, new URL(request.url).origin);
  const broadcasts = await runBroadcasts({ today, deadline: started + 50_000 });
  const result = { reminders, broadcasts };
  if (reminders.sent || reminders.failed || broadcasts.sent || broadcasts.failed) console.log("Daily job:", JSON.stringify(result));
  return Response.json(result);
}
