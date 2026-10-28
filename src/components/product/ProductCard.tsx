import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { CardAction } from "./CardAction";
import { CATEGORY_TONE } from "./tones";

/**
 * A raised card with two sheets tucked behind it, like a small stack of prints.
 * The sheets fan out a little on hover. Photo on top, then name, price and one action.
 */
export function ProductCard({ product }: { product: Product }) {
  const sheet = CATEGORY_TONE[product.category].sheet;
  const made = product.personalization.kind !== "none";
  return (
    <article className="group relative pr-2.5 pb-3.5 sm:pr-3.5 sm:pb-4">
      <div
        aria-hidden
        className={`absolute inset-0 top-5 left-5 rounded-[1.6rem] ${sheet} shadow-card transition-transform duration-500 ease-quill group-hover:translate-x-1 group-hover:translate-y-1.5`}
      />
      <div
        aria-hidden
        className="absolute top-2.5 right-1.5 bottom-2 left-2.5 rounded-[1.6rem] bg-vellum sm:right-2 sm:bottom-2.5 shadow-card transition-transform duration-500 ease-quill group-hover:translate-x-0.5 group-hover:translate-y-0.5"
      />
      <div className="relative rounded-[1.6rem] bg-vellum p-1.5 shadow-card ring-1 ring-ink/[0.04] transition-transform duration-500 ease-quill group-hover:-translate-y-1 sm:p-2">
        <Link href={`/products/${product.slug}`} tabIndex={-1} aria-hidden className="block">
          <ProductImage product={product} className="rounded-[1.2rem]" />
        </Link>
        {made && (
          <span className="absolute top-3.5 left-3.5 rounded-full bg-vellum/90 px-2.5 py-1 text-[0.7rem] text-ink shadow-sm sm:top-4 sm:left-4 sm:text-xs">
            Your words
          </span>
        )}
        <div className="flex items-end justify-between gap-2 px-1.5 pt-3 pb-1 sm:gap-3 sm:px-2">
          <div className="min-w-0">
            <h3 className="font-sans text-[0.9rem] leading-snug font-semibold tracking-normal text-ink sm:text-base">
              <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:rounded-[1.6rem] after:content-['']">
                {product.name}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-[0.82rem] text-ink-soft tabular-nums sm:text-sm">
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${made ? "bg-gold" : "bg-leaf-light"}`} />
              {formatNaira(product.price)}
            </p>
          </div>
          <div className="relative z-10">
            <CardAction product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}
