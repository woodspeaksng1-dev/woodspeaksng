"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";
import { STATUS_LABEL, type OrderRow, type OrderStatus } from "@/lib/orders";
import { shortDate, shortDateTime } from "@/lib/admin/format";
import { AdminHeader, Badge } from "./AdminShell";

type View = "to-do" | "paid" | "crafting" | "dispatched" | "delivered" | "pending" | "all";

const VIEWS: { id: View; label: string; match: (s: OrderStatus) => boolean }[] = [
  { id: "to-do", label: "To do", match: (s) => s === "paid" || s === "crafting" },
  { id: "paid", label: "Paid", match: (s) => s === "paid" },
  { id: "crafting", label: "Crafting", match: (s) => s === "crafting" },
  { id: "dispatched", label: "Dispatched", match: (s) => s === "dispatched" },
  { id: "delivered", label: "Delivered", match: (s) => s === "delivered" },
  { id: "pending", label: "Awaiting payment", match: (s) => s === "pending" },
  { id: "all", label: "All paid", match: (s) => s !== "pending" },
];

/** Real orders, newest first. "To do" shows what the workshop has to make. */
export function OrdersList({ orders }: { orders: OrderRow[] }) {
  const [view, setView] = useState<View>("to-do");
  const [query, setQuery] = useState("");
  const current = VIEWS.find((v) => v.id === view)!;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(
      (o) =>
        current.match(o.status) &&
        (!q || o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.items.toLowerCase().includes(q)),
    );
  }, [orders, current, query]);

  return (
    <div>
      <AdminHeader title="Orders" intro="Newest first. Open an order to see the personalisation, move it on or print the workshop sheet." />
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="radiogroup" aria-label="Which orders" className="flex gap-2 overflow-x-auto pb-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={view === v.id}
              onClick={() => setView(v.id)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${
                view === v.id ? "border-oxblood bg-oxblood text-vellum" : "border-rule bg-vellum text-ink hover:border-oxblood"
              }`}
            >
              {v.label} ({orders.filter((o) => v.match(o.status)).length})
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search number, name or item"
          aria-label="Search orders"
          className="h-10 w-full rounded-full border border-rule bg-vellum px-4 text-sm text-ink outline-none focus:border-oxblood md:w-64"
        />
      </div>
      <ul className="mt-6 flex flex-col gap-3">
        {shown.map((o) => (
          <li key={o.number}>
            <Link
              href={`/admin/orders/${o.number}`}
              className="grid gap-x-6 gap-y-1 rounded-2xl bg-vellum p-4 shadow-card transition-colors hover:ring-1 hover:ring-oxblood sm:grid-cols-[10rem_1fr_auto]"
            >
              <span className="font-semibold tabular-nums">{o.number}</span>
              <span className="min-w-0">
                <span className="block truncate">{o.items}</span>
                <span className="block text-sm text-ink-soft">
                  {o.customerName} · {o.zoneName} · deliver {shortDate(o.deliveryDate)}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                {o.paymentProblem && <Badge tone="wine">Check payment</Badge>}
                {o.nfcToWrite && <Badge tone="gold">NFC tag to write</Badge>}
                <Badge tone={o.status === "paid" ? "wine" : o.status === "delivered" || o.status === "pending" ? "quiet" : "neutral"}>
                  {STATUS_LABEL[o.status]}
                </Badge>
                <span className="text-sm tabular-nums">{formatNaira(o.total)}</span>
              </span>
              <span className="text-xs text-ink-soft sm:col-start-2">
                {o.paidAt ? `Paid ${shortDateTime(o.paidAt)}` : `Started ${shortDateTime(o.createdAt)}`}
              </span>
            </Link>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-10 text-center text-ink-soft">
            {orders.length === 0 ? "No orders yet. They appear here as soon as someone checks out." : "No orders here."}
          </li>
        )}
      </ul>
    </div>
  );
}
