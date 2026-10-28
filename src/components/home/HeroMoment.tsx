"use client";

import Link from "next/link";
import { useState } from "react";
import { MomentMedia } from "../media/MomentMedia";

/**
 * A real customer receiving their gift, beside the product (desktop) or under
 * the seal (phones). Proof, not the main event: it stays small.
 * Media: public/media/hero/customer.(webp|jpg) and optionally .mp4.
 */
export function HeroMoment({ className = "" }: { className?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <figure
      className={`group flex items-center gap-4 rounded-[1.4rem] bg-vellum p-2 pr-5 shadow-card lg:w-[230px] lg:flex-col lg:items-stretch lg:gap-0 lg:pr-2 ${className}`}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <MomentMedia
        mediaKey="hero/customer"
        label="A couple reading a Woodspeaks love scroll together at lunch"
        active={hover}
        className="aspect-square w-20 shrink-0 rounded-2xl [&_span]:hidden lg:aspect-[4/5] lg:w-full lg:[&_span]:inline"
      />
      <figcaption className="min-w-0 lg:px-2 lg:pt-3 lg:pb-2">
        <p className="font-display text-[1.05rem] leading-snug text-ink">The moment it lands</p>
        <p className="mt-0.5 text-sm text-ink-soft">A love scroll, read aloud over lunch</p>
        <Link
          href="/about/gallery"
          className="mt-1.5 inline-block text-sm text-oxblood underline decoration-gold/60 underline-offset-4 hover:decoration-oxblood"
        >
          See more moments
        </Link>
      </figcaption>
    </figure>
  );
}
