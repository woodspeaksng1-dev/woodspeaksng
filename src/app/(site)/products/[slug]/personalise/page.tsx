import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { findProductBySlug } from "@/lib/catalog";
import { getStorefront } from "@/lib/server/catalog";
import { uploadsEnabled } from "@/lib/server/uploads";
import { CustomizerLoader } from "./CustomizerLoader";

export async function generateStaticParams() {
  const { products } = await getStorefront();
  return products.filter((p) => p.personalization.kind !== "none").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]/personalise">): Promise<Metadata> {
  const { slug } = await params;
  const product = findProductBySlug(await getStorefront(), slug);
  // A step in buying, not a page to find in search.
  return { title: product ? `Personalise your ${product.name}` : "Personalise", robots: { index: false } };
}

async function Personalise({ params }: Pick<PageProps<"/products/[slug]/personalise">, "params">) {
  const { slug } = await params;
  const product = findProductBySlug(await getStorefront(), slug);
  if (!product || product.personalization.kind === "none") notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-10">
      <CustomizerLoader product={product} uploads={uploadsEnabled()} />
    </div>
  );
}

// Which product it is comes from the URL, so it's read inside <Suspense>: when the page is rebuilt after a
// change in admin, Next makes its shell without the URL first (see the ISR with Cache Components guide).
export default function PersonalisePage({ params }: PageProps<"/products/[slug]/personalise">) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-7xl px-4 sm:px-6 lg:px-10" />}>
      <Personalise params={params} />
    </Suspense>
  );
}
