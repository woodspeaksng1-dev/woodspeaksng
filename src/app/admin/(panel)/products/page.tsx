import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsList } from "@/components/admin/ProductsList";
import { requireStaff } from "@/lib/server/admin-session";
import { readCatalog } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Products" };

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading products…</p>}>
      <Products />
    </Suspense>
  );
}

async function Products() {
  await requireStaff();
  return <ProductsList products={(await readCatalog()).products} />;
}
