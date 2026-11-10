import type { Metadata } from "next";
import { ActivityLog } from "@/components/admin/ActivityLog";

export const metadata: Metadata = { title: "Activity" };

export default function AdminActivityLogPage() {
  return <ActivityLog />;
}
