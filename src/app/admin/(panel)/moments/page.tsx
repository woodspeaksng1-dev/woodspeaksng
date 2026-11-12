import type { Metadata } from "next";
import { Suspense } from "react";
import { MomentsManager } from "@/components/admin/MomentsManager";
import { requireStaff } from "@/lib/server/admin-session";
import { readCatalog } from "@/lib/server/catalog";
import { readMoments } from "@/lib/server/moments";

export const metadata: Metadata = { title: "Moments" };

export default function AdminMomentsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading moments…</p>}>
      <Moments />
    </Suspense>
  );
}

async function Moments() {
  await requireStaff();
  const [moments, catalog] = await Promise.all([readMoments(), readCatalog()]);
  return <MomentsManager moments={moments} products={catalog.products.map((p) => ({ slug: p.slug, name: p.name }))} />;
}
