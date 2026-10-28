"use client";

import { useAdmin } from "@/lib/admin/store";
import { shortDate } from "@/lib/admin/format";
import { AdminHeader, Card } from "./AdminShell";

const weekBefore = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d - 7);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export function RemindersList() {
  const reminders = [...useAdmin((s) => s.reminders)].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div>
      <AdminHeader title="Reminders" intro="Dates customers asked us to remember. Each reminder email sends on its own a week before; nothing to do here." />
      <Card className="mt-6">
        <ul className="divide-y divide-rule">
          {reminders.map((r) => (
            <li key={r.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <span>
                <span className="block">
                  {r.occasion}, {shortDate(r.date)}
                </span>
                <span className="text-sm text-ink-soft">{r.email}</span>
              </span>
              <span className="text-sm text-ink-soft">Email goes out {shortDate(weekBefore(r.date))}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
