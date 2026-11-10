import type { Metadata } from "next";
import { Suspense } from "react";
import { Overview } from "@/components/admin/Overview";
import { listOrders } from "@/lib/server/admin-orders";
import { requireStaff } from "@/lib/server/admin-session";

export const metadata: Metadata = { title: { absolute: "Admin | Woodspeaks" } };

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading…</p>}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const staff = await requireStaff();
  const firstName = (staff.name ?? staff.email).split(/[ @]/)[0];
  return <Overview orders={await listOrders()} firstName={firstName} />;
}
