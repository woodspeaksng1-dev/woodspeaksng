"use client";

import Link from "next/link";
import { useState } from "react";
import { findProductBySlug } from "@/lib/catalog";
import { useCatalog } from "@/components/catalog/CatalogProvider";
import type { Moment } from "@/lib/gallery";
import { MomentMedia } from "@/components/media/MomentMedia";

const ASPECT: Record<Moment["shape"], string> = {
  tall: "aspect-[3/4]",
  portrait: "aspect-[4/5]",
  square: "aspect-square",
};

export function GalleryCard({ moment, tone }: { moment: Moment; tone: number }) {
  const [hover, setHover] = useState(false);
  const catalog = useCatalog();
  const product = moment.productSlug ? findProductBySlug(catalog, moment.productSlug) : undefined;
  return (
    <figure
      className="group rounded-[1.5rem] bg-vellum p-1.5 shadow-card sm:p-2"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <MomentMedia
        mediaKey={`gallery/${moment.id}`}
        label={moment.caption}
        active={hover}
        tone={tone}
        className={`${ASPECT[moment.shape]} rounded-[1.1rem]`}
      />
      <figcaption className="px-1.5 pt-3 pb-1.5 sm:px-2">
        <p className="text-sm font-semibold text-ink sm:text-base">{moment.caption}</p>
        {moment.who && <p className="text-[0.82rem] text-ink-soft sm:text-sm">{moment.who}</p>}
        {product && (
          <Link
            href={`/products/${product.slug}`}
            className="mt-2 inline-block text-[0.82rem] text-oxblood underline decoration-gold/60 underline-offset-4 hover:decoration-oxblood sm:text-sm"
          >
            {product.name}
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
