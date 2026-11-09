import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProductBySlug } from "@/lib/catalog";
import { getStorefront } from "@/lib/server/catalog";
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

export default async function PersonalisePage({ params }: PageProps<"/products/[slug]/personalise">) {
  const { slug } = await params;
  const product = findProductBySlug(await getStorefront(), slug);
  if (!product || product.personalization.kind === "none") notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-10">
      <CustomizerLoader product={product} />
    </div>
  );
}
