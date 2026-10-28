"use client";

import { useState } from "react";
import { imageSrc } from "@/lib/media";

/**
 * Brands Woodspeaks has made gifts for, scrolling endlessly. Logos come from the
 * client's current site, turned into single-colour (white) marks so the row reads
 * as one set: public/media/brands/<key>.png.
 */
const BRANDS = [
  { key: "totalenergies", name: "TotalEnergies", h: "h-9" },
  { key: "kpmg", name: "KPMG", h: "h-7" },
  { key: "mavins", name: "Mavin Records", h: "h-11" },
  { key: "senocean", name: "Senocean Law Practice", h: "h-9" },
  { key: "scotfree", name: "Scotfree", h: "h-7" },
  { key: "kedoket", name: "Kedoket", h: "h-11" },
  { key: "gaia", name: "Gaia", h: "h-11" },
]
  .map((b) => ({ ...b, src: imageSrc(`brands/${b.key}`) }))
  .filter((b) => b.src);

export function TrustedBy() {
  const [paused, setPaused] = useState(false);
  if (BRANDS.length === 0) return null;
  return (
    <section className="bg-oxblood py-14 text-vellum md:py-16" aria-labelledby="trusted-by">
      <h2 id="trusted-by" className="px-4 text-center text-2xl md:text-3xl">
        Trusted by top brands
      </h2>
      <div
        className="marquee mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]"
        data-paused={paused}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <ul className="marquee-track flex w-max items-center gap-16 pr-16 md:gap-20 md:pr-20">
          {[...BRANDS, ...BRANDS].map((b, idx) => (
            <li key={idx} aria-hidden={idx >= BRANDS.length} className="flex h-12 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src!} alt={b.name} className={`${b.h} w-auto opacity-80`} loading="lazy" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
