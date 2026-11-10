import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersList } from "@/components/admin/OrdersList";
import { listOrders } from "@/lib/server/admin-orders";
import { requireStaff } from "@/lib/server/admin-session";

export const metadata: Metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading orders…</p>}>
      <Orders />
    </Suspense>
  );
}

async function Orders() {
  await requireStaff();
  return <OrdersList orders={await listOrders()} />;
}
