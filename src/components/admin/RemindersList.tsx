import Link from "next/link";
import { shortDate } from "@/lib/admin/format";
import type { AdminReminderRow } from "@/lib/server/reminders";
import { AdminHeader, Card } from "./AdminShell";

/** Every active yearly reminder, soonest first. They send by themselves; this is to see what's coming. */
export function RemindersList({ reminders }: { reminders: AdminReminderRow[] }) {
  return (
    <div>
      <AdminHeader
        title="Reminders"
        intro={`${reminders.length} buyer${reminders.length === 1 ? " has" : "s have"} asked to be reminded each year. Each email goes out by itself at 8am, a week before the date, and links to the shop. Buyers can stop them from the email or their account.`}
      />
      <Card className="mt-6">
        {reminders.length === 0 ? (
          <p className="text-ink-soft">None yet. Buyers set them on the order confirmation page.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {reminders.map((r) => (
              <li key={r.orderNumber} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="min-w-0">
                  <span className="block truncate">
                    {r.firstName}, for {r.deliverTo}
                  </span>
                  <span className="block truncate text-sm text-ink-soft">
                    {r.email} · {r.items} ·{" "}
                    <Link href={`/admin/orders/${r.orderNumber}`} className="underline underline-offset-2">
                      {r.orderNumber}
                    </Link>
                  </span>
                </span>
                <span className="text-sm sm:text-right">
                  <span className="block">Date {r.nextOccasion && shortDate(r.nextOccasion)}</span>
                  <span className="block text-ink-soft">
                    Emails {r.nextSendOn && shortDate(r.nextSendOn)}
                    {r.lastSentAt && ` · last sent ${shortDate(r.lastSentAt)}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
