"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { Product } from "@/lib/types";
import { ProductImage } from "./ProductImage";
import { CATEGORY_TONE } from "./tones";

/*
 * The product page's photos when staff have added more than the main one: swipe through them on a phone,
 * or tap a thumbnail. The main photo comes first, drawn by ProductImage (so its fallbacks still apply).
 * Plain scroll snapping does the swiping; the thumbnails follow along.
 */
export function ProductGallery({ product, className = "" }: { product: Product; className?: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const reduce = useReducedMotion();
  const extras = product.gallery ?? [];
  const count = extras.length + 1;
  const alt = product.imageAlt || product.name;

  const show = (i: number) => {
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="min-w-0">
      <div
        ref={strip}
        onScroll={(e) => setAt(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
        aria-roledescription="carousel"
        aria-label={`Photos of ${product.name}`}
      >
        <div className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`1 of ${count}`}>
          <ProductImage product={product} />
        </div>
        {extras.map((src, i) => (
          <div key={src} className={`relative aspect-[4/5] w-full shrink-0 snap-center bg-gradient-to-b ${CATEGORY_TONE[product.category].image}`} aria-roledescription="slide" aria-label={`${i + 2} of ${count}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${alt}, photo ${i + 2}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[product.image ?? null, ...extras].map((src, i) => (
          <button
            key={src ?? "main"}
            type="button"
            onClick={() => show(i)}
            aria-label={`Show photo ${i + 1} of ${count}`}
            aria-current={at === i}
            className={`relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-b ${CATEGORY_TONE[product.category].image} ring-offset-2 ring-offset-parchment transition-shadow ${at === i ? "ring-2 ring-oxblood" : "opacity-75 hover:opacity-100"}`}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <ProductImage product={product} className="pointer-events-none absolute inset-0 [&_span]:hidden" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
