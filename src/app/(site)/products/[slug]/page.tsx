import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { findProductBySlug } from "@/lib/catalog";
import { getStorefront } from "@/lib/server/catalog";
import { formatNaira } from "@/lib/format";
import { ProductImage } from "@/components/product/ProductImage";
import { ProductReviews } from "@/components/product/ProductReviews";
import { AddToCart } from "./AddToCart";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbLd, productLd } from "@/lib/structured-data";
import { imageSrc } from "@/lib/media";

export async function generateStaticParams() {
  return (await getStorefront()).products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = findProductBySlug(await getStorefront(), slug);
  if (!product) return {};
  const path = `/products/${product.slug}`;
  const share = imageSrc(`og/${product.slug}`) ?? (product.image || null);
  const personal = product.personalization.kind !== "none";
  const description = `${product.description} ${formatNaira(product.price)}.${personal ? " Personalised for you and made" : " Made"} by hand in Lagos.`;
  return pageMeta({
    title: product.seoTitle || (personal ? `${product.name}, personalised` : product.name),
    ogTitle: `${product.name} | Woodspeaks`,
    description,
    path,
    image: share ? { url: share, alt: product.name } : null,
  });
}

async function Product({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const catalog = await getStorefront();
  const product = findProductBySlug(catalog, slug);
  if (!product) notFound();

  const p = product.personalization;
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-6 pb-36 sm:px-6 md:grid-cols-2 md:gap-16 md:pb-28 lg:px-10">
      <JsonLd
        data={[
          productLd(product),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
            { name: product.name, path: `/products/${product.slug}` },
          ]),
        ]}
      />
      <ProductImage product={product} className="rounded-[2rem] shadow-card" />
      <div className="md:pt-6">
        <h1 className="text-4xl text-oxblood md:text-5xl">{product.name}</h1>
        <p className="mt-3 font-display text-2xl tabular-nums">{formatNaira(product.price)}</p>
        <p className="mt-6 max-w-prose text-lg text-ink-soft">{product.description}</p>

        <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-t border-rule pt-6 text-sm">
          {p.kind === "letter" && (
            <>
              <dt className="text-ink-soft">Your words</dt>
              <dd>A letter of up to {p.maxWords} words, written by hand</dd>
            </>
          )}
          {p.kind === "reasons" && (
            <>
              <dt className="text-ink-soft">Your words</dt>
              <dd>
                Our reasons, or your own {p.count} (up to {p.maxWordsEach} words each) for {formatNaira(p.fee)} more
              </dd>
            </>
          )}
          {p.kind === "photo" && (
            <>
              <dt className="text-ink-soft">Your photo</dt>
              <dd>Upload a photo and we set it in place</dd>
            </>
          )}
          {p.kind === "video" && (
            <>
              <dt className="text-ink-soft">Your video</dt>
              <dd>Upload a video up to {p.maxMb} MB, or paste a link to one</dd>
            </>
          )}
          {product.dimensions && (
            <>
              <dt className="text-ink-soft">Size</dt>
              <dd>{product.dimensions}</dd>
            </>
          )}
          {product.included && (
            <>
              <dt className="text-ink-soft">What&rsquo;s included</dt>
              <dd>{product.included}</dd>
            </>
          )}
          <dt className="text-ink-soft">Crafting time</dt>
          <dd>About {catalog.craftingDays} days, made by hand</dd>
          <dt className="text-ink-soft">Delivery</dt>
          <dd>{product.perishable ? "Selected Lagos areas, on the day" : "Fee shown at checkout by area"}</dd>
        </dl>

        <AddToCart product={product} />
      </div>
      <ProductReviews product={product} />
    </div>
  );
}

// Which product it is comes from the URL, so it's read inside <Suspense>: when the page is rebuilt after a
// change in admin, Next makes its shell without the URL first (see the ISR with Cache Components guide).
export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-7xl px-4 sm:px-6 lg:px-10" />}>
      <Product params={params} />
    </Suspense>
  );
}
