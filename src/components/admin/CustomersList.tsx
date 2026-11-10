import { formatNaira } from "@/lib/format";
import type { CustomerRow } from "@/lib/server/admin-orders";
import { shortDate } from "@/lib/admin/format";
import { AdminHeader, Badge, Card } from "./AdminShell";

/** Everyone who has bought, from their paid orders. Most recent first. */
export function CustomersList({ customers }: { customers: CustomerRow[] }) {
  return (
    <div>
      <AdminHeader
        title="Customers"
        intro={`${customers.length} ${customers.length === 1 ? "person has" : "people have"} bought. Only those marked "Updates" agreed to marketing emails.`}
      />
      <Card className="mt-6">
        {customers.length === 0 ? (
          <p className="text-ink-soft">No customers yet. They appear here after their first paid order.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {customers.map((c) => (
              <li key={c.email} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="min-w-0">
                  <span className="block truncate">{c.name}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    {c.email} · {c.phone}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-3 text-sm sm:justify-end">
                  {c.marketingOptIn && <Badge tone="gold">Updates</Badge>}
                  <span className="text-ink-soft">
                    {c.orders} order{c.orders === 1 ? "" : "s"} · last {shortDate(c.lastOrder.slice(0, 10))}
                  </span>
                  <span className="tabular-nums">{formatNaira(c.spent)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
