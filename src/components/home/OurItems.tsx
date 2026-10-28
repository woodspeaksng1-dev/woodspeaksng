import Link from "next/link";
import { featuredProducts } from "@/lib/catalog";
import { ProductCard } from "../product/ProductCard";

export function OurItems() {
  const products = featuredProducts();
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 pb-20 sm:px-6 md:py-28 lg:px-10" aria-labelledby="our-items">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="our-items" className="text-4xl text-ink md:text-5xl">
          Our items
        </h2>
        <p className="max-w-sm text-ink-soft">Each piece is made by hand, and most can carry your own words.</p>
      </div>
      <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 md:gap-x-8 md:gap-y-12">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
      <div className="mt-14 flex justify-center">
        <Link
          href="/shop"
          className="inline-flex h-12 items-center rounded-full border border-ink/80 px-8 text-ink transition-colors hover:bg-ink hover:text-vellum"
        >
          See all gifts
        </Link>
      </div>
    </section>
  );
}
