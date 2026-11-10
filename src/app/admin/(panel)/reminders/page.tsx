import type { Metadata } from "next";
import { Suspense } from "react";
import { RemindersList } from "@/components/admin/RemindersList";
import { requireStaff } from "@/lib/server/admin-session";
import { listUpcomingReminders } from "@/lib/server/reminders";

export const metadata: Metadata = { title: "Reminders" };

export default function AdminRemindersPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading reminders…</p>}>
      <Reminders />
    </Suspense>
  );
}

async function Reminders() {
  await requireStaff();
  return <RemindersList reminders={await listUpcomingReminders()} />;
}
