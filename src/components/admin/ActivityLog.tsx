import type { AuditEntry } from "@/lib/server/admin-activity";
import { shortDateTime } from "@/lib/admin/format";
import { AdminHeader, Card } from "./AdminShell";

export function ActivityLog({ entries }: { entries: AuditEntry[] }) {
  return (
    <div>
      <AdminHeader title="Activity" intro="Every payment and every change in the admin panel, with who made it and when. Newest first." />
      <Card className="mt-6">
        {entries.length === 0 ? (
          <p className="text-ink-soft">Nothing yet. Payments, order moves and edits show here as they happen.</p>
        ) : (
          <ol className="divide-y divide-rule">
            {entries.map((a, i) => (
              <li key={i} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr_auto]">
                <span className="text-sm text-ink-soft">{shortDateTime(a.at)}</span>
                <span className="min-w-0 break-words">
                  {a.action} <span className="text-ink-soft">{a.target}</span>
                </span>
                <span className="text-sm text-ink-soft">{a.by}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
