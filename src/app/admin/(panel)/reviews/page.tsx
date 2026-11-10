import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsManager } from "@/components/admin/ReviewsManager";
import { requireStaff } from "@/lib/server/admin-session";
import { readCatalog } from "@/lib/server/catalog";
import { readReviews } from "@/lib/server/reviews";

export const metadata: Metadata = { title: "Reviews" };

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading reviews…</p>}>
      <Reviews />
    </Suspense>
  );
}

async function Reviews() {
  await requireStaff();
  const [reviews, catalog] = await Promise.all([readReviews(), readCatalog()]);
  return <ReviewsManager reviews={reviews} products={catalog.products.map((p) => ({ id: p.id, name: p.name }))} />;
}
