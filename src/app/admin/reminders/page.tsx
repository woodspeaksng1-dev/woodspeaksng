import type { Metadata } from "next";
import { RemindersList } from "@/components/admin/RemindersList";

export const metadata: Metadata = { title: "Reminders" };

export default function AdminRemindersListPage() {
  return <RemindersList />;
}
