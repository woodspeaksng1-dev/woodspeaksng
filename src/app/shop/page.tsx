import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Suspense } from "react";
import { ShopGrid, ShopGridFromParams } from "./ShopGrid";

export const metadata: Metadata = pageMeta({
  title: "Shop personalised gifts",
  description:
    "Love scrolls, 20 Reasons puzzles, lockets, pocket watches and keepsakes, personalised with your words and made by hand in Lagos. Delivery across Nigeria.",
  path: "/shop",
});

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-28 sm:px-6 lg:px-10">
      <h1 className="text-5xl text-ink md:text-6xl">Shop</h1>
      <p className="mt-3 max-w-lg text-ink-soft">
        Find something for the occasion, or for the person. Most pieces can carry your own words.
      </p>
      <Suspense fallback={<ShopGrid personalisedOnly={false} />}>
        <ShopGridFromParams />
      </Suspense>
    </div>
  );
}
