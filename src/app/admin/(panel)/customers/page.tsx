import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomersList } from "@/components/admin/CustomersList";
import { listCustomers } from "@/lib/server/admin-orders";
import { requireStaff } from "@/lib/server/admin-session";

export const metadata: Metadata = { title: "Customers" };

export default function AdminCustomersListPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading customers…</p>}>
      <Customers />
    </Suspense>
  );
}

async function Customers() {
  await requireStaff();
  return <CustomersList customers={await listCustomers()} />;
}
