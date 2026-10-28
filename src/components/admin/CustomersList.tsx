"use client";

import { formatNaira } from "@/lib/format";
import { orderTotal, useAdmin } from "@/lib/admin/store";
import { AdminHeader, Badge, Card } from "./AdminShell";

export function useCustomers() {
  const orders = useAdmin((s) => s.orders);
  const map = new Map<string, { name: string; email: string; phone: string; orders: number; spent: number; optIn: boolean }>();
  for (const o of orders) {
    const c = map.get(o.customer.email) ?? { ...o.customer, orders: 0, spent: 0 };
    c.orders += 1;
    c.spent += orderTotal(o);
    map.set(o.customer.email, c);
  }
  return [...map.values()];
}

export function CustomersList() {
  const customers = useCustomers();
  const optedIn = customers.filter((c) => c.optIn).length;
  return (
    <div>
      <AdminHeader title="Customers" intro={`${customers.length} customers, ${optedIn} opted in to updates and gift reminders.`} />
      <Card className="mt-6">
        <ul className="divide-y divide-rule">
          {customers.map((c) => (
            <li key={c.email} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
              <span className="min-w-0">
                <span className="block">{c.name}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {c.email} · {c.phone}
                </span>
              </span>
              <span className="text-sm text-ink-soft tabular-nums">
                {c.orders} order{c.orders === 1 ? "" : "s"} · {formatNaira(c.spent)}
              </span>
              <Badge tone={c.optIn ? "gold" : "quiet"}>{c.optIn ? "Opted in" : "Order emails only"}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
