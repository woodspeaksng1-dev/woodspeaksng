import Link from "next/link";
import { formatNaira } from "@/lib/format";
import type { OrderRow } from "@/lib/orders";
import { AdminHeader, Card } from "./AdminShell";

/** What needs attention today, from the real orders. */
export function Overview({ orders, firstName }: { orders: OrderRow[]; firstName: string }) {
  const count = (status: OrderRow["status"]) => orders.filter((o) => o.status === status).length;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const paidThisMonth = orders.filter((o) => o.paidAt && new Date(o.paidAt) >= monthStart);

  const tiles = [
    { label: "New, to start", value: count("paid") },
    { label: "Being crafted", value: count("crafting") },
    { label: "Out for delivery", value: count("dispatched") },
    { label: "NFC tags to write", value: orders.filter((o) => o.nfcToWrite).length },
  ];
  const problems = orders.filter((o) => o.paymentProblem).length;

  return (
    <div>
      <AdminHeader title={`Good day, ${firstName}`} intro="What needs your attention in the workshop today." />
      {problems > 0 && (
        <Card className="mt-6 border border-oxblood">
          <p className="text-oxblood">
            {problems} payment{problems === 1 ? "" : "s"} didn&rsquo;t match {problems === 1 ? "its order" : "their orders"}.{" "}
            <Link href="/admin/orders" className="underline underline-offset-2">
              Check them
            </Link>{" "}
            before making anything.
          </p>
        </Card>
      )}
      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href="/admin/orders" className="block rounded-2xl bg-vellum p-5 shadow-card transition-transform hover:-translate-y-0.5">
              <span className="block font-display text-4xl text-oxblood tabular-nums">{t.value}</span>
              <span className="mt-1 block text-sm text-ink-soft">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl text-oxblood">This month</h2>
          <p className="mt-2 text-ink">
            {paidThisMonth.length} paid order{paidThisMonth.length === 1 ? "" : "s"},{" "}
            <span className="tabular-nums">{formatNaira(paidThisMonth.reduce((n, o) => n + o.total, 0))}</span> including delivery.
          </p>
        </Card>
        <Card>
          <h2 className="text-2xl text-oxblood">Awaiting payment</h2>
          <p className="mt-2 text-ink">
            {count("pending")} checkout{count("pending") === 1 ? "" : "s"} started but not paid. They move to Paid on their own if the buyer finishes.
          </p>
        </Card>
      </div>
    </div>
  );
}
