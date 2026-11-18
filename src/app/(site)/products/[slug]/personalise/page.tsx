import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findProductBySlug } from "@/lib/catalog";
import { getStorefront } from "@/lib/server/catalog";
import { isSoldOut } from "@/lib/stock";
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

  if (isSoldOut(product))
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
        <h1 className="text-4xl text-oxblood">{product.name} is sold out</h1>
        <p className="mt-4 text-lg text-ink-soft">Message us on WhatsApp and we&rsquo;ll tell you when it&rsquo;s back, or find another gift.</p>
        <Link href="/shop" className="mt-8 rounded-full bg-oxblood px-8 py-3.5 text-vellum transition-colors hover:bg-wine">
          Browse the shop
        </Link>
      </div>
    );

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
