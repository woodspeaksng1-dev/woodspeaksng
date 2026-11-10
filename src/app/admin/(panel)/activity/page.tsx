import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityLog } from "@/components/admin/ActivityLog";
import { recentActivity } from "@/lib/server/admin-activity";
import { requireStaff } from "@/lib/server/admin-session";

export const metadata: Metadata = { title: "Activity" };

export default function AdminActivityLogPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading activity…</p>}>
      <Activity />
    </Suspense>
  );
}

async function Activity() {
  await requireStaff();
  return <ActivityLog entries={await recentActivity()} />;
}
