import type { Metadata } from "next";
import { Suspense } from "react";
import { DeliverySettings } from "@/components/admin/DeliverySettings";
import { requireStaff } from "@/lib/server/admin-session";
import { readCatalog } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Delivery" };

export default function AdminDeliverySettingsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading delivery areas…</p>}>
      <Delivery />
    </Suspense>
  );
}

async function Delivery() {
  await requireStaff();
  const { zones, craftingDays } = await readCatalog();
  // Keyed by the list of areas, so adding or removing one rebuilds the rows (edits keep their messages).
  return <DeliverySettings key={zones.map((z) => z.id).join()} zones={zones} craftingDays={craftingDays} />;
}
