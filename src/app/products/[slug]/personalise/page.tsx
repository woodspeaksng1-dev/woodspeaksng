import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS, getProductBySlug } from "@/lib/catalog";
import { CustomizerLoader } from "./CustomizerLoader";

const personalisable = () => PRODUCTS.filter((p) => p.personalization.kind !== "none");

export function generateStaticParams() {
  return personalisable().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]/personalise">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  // A step in buying, not a page to find in search.
  return { title: product ? `Personalise your ${product.name}` : "Personalise", robots: { index: false } };
}

export default async function PersonalisePage({ params }: PageProps<"/products/[slug]/personalise">) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product || product.personalization.kind === "none") notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-10">
      <CustomizerLoader slug={slug} />
    </div>
  );
}
