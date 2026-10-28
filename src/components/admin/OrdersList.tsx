"use client";

import Link from "next/link";
import { useState } from "react";
import { getProduct, getZone } from "@/lib/catalog";
import { formatNaira } from "@/lib/format";
import { NFC_LABEL, STATUS_FLOW, STATUS_LABEL, orderTotal, useAdmin } from "@/lib/admin/store";
import { shortDate, shortDateTime } from "@/lib/admin/format";
import type { OrderStatus } from "@/lib/admin/sample-data";
import { AdminHeader, Badge } from "./AdminShell";

export function OrdersList() {
  const orders = useAdmin((s) => s.orders);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const shown = [...orders]
    .filter((o) => filter === "all" || o.status === filter)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));

  return (
    <div>
      <AdminHeader title="Orders" intro="Newest first. Open an order to see the personalisation, move its status or print the workshop sheet." />
      <div role="radiogroup" aria-label="Filter by status" className="mt-6 flex gap-2 overflow-x-auto">
        {(["all", ...STATUS_FLOW] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={filter === s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${
              filter === s ? "border-oxblood bg-oxblood text-vellum" : "border-rule bg-vellum text-ink hover:border-oxblood"
            }`}
          >
            {s === "all" ? `All (${orders.length})` : `${STATUS_LABEL[s]} (${orders.filter((o) => o.status === s).length})`}
          </button>
        ))}
      </div>
      <ul className="mt-6 flex flex-col gap-3">
        {shown.map((o) => (
          <li key={o.number}>
            <Link
              href={`/admin/orders/${o.number}`}
              className="grid gap-x-6 gap-y-1 rounded-2xl bg-vellum p-4 shadow-card transition-colors hover:ring-1 hover:ring-oxblood sm:grid-cols-[8rem_1fr_auto]"
            >
              <span className="font-semibold tabular-nums">{o.number}</span>
              <span className="min-w-0">
                <span className="block truncate">{o.lines.map((l) => getProduct(l.productId)?.name).join(", ")}</span>
                <span className="block text-sm text-ink-soft">
                  {o.customer.name} · {getZone(o.zoneId)?.name} · deliver {shortDate(o.deliveryDate)}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                {o.nfc && o.nfc.status !== "written" && <Badge tone="gold">{NFC_LABEL[o.nfc.status]}</Badge>}
                <Badge tone={o.status === "paid" ? "wine" : o.status === "delivered" ? "quiet" : "neutral"}>{STATUS_LABEL[o.status]}</Badge>
                <span className="text-sm tabular-nums">{formatNaira(orderTotal(o))}</span>
              </span>
              <span className="text-xs text-ink-soft sm:col-start-2">Placed {shortDateTime(o.placedAt)}</span>
            </Link>
          </li>
        ))}
        {shown.length === 0 && <li className="py-10 text-center text-ink-soft">No orders here.</li>}
      </ul>
    </div>
  );
}
