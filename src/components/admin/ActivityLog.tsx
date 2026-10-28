"use client";

import { useAdmin } from "@/lib/admin/store";
import { shortDateTime } from "@/lib/admin/format";
import { AdminHeader, Card } from "./AdminShell";

export function ActivityLog() {
  const audit = useAdmin((s) => s.audit);
  return (
    <div>
      <AdminHeader title="Activity" intro="Every change in the admin panel, with who made it and when." />
      <Card className="mt-6">
        {audit.length === 0 ? (
          <p className="text-ink-soft">No changes yet in this session. Move an order on, edit a product or save a delivery fee and it shows here.</p>
        ) : (
          <ol className="divide-y divide-rule">
            {audit.map((a, i) => (
              <li key={i} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr_auto]">
                <span className="text-sm text-ink-soft">{shortDateTime(a.at)}</span>
                <span>{a.what}</span>
                <span className="text-sm text-ink-soft">{a.by}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
