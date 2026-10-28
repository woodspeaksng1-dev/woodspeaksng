"use client";

import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";

/**
 * Customer photos in a fanned stack; tapping spreads them into a gallery.
 * PLACEHOLDER cards until the client sends photos (with each customer's consent).
 */
const PHOTOS = [
  { id: "p1", caption: "Customer photo", rotate: -9, x: "-60%", tint: "from-oxblood/25" },
  { id: "p2", caption: "Customer photo", rotate: -4, x: "-30%", tint: "from-gold/30" },
  { id: "p3", caption: "Customer photo", rotate: 1, x: "0%", tint: "from-wine/25" },
  { id: "p4", caption: "Customer photo", rotate: 5, x: "30%", tint: "from-gold/25" },
  { id: "p5", caption: "Customer photo", rotate: 10, x: "60%", tint: "from-oxblood/20" },
];

function PhotoCard({ caption, tint }: { caption: string; tint: string }) {
  return (
    <div className="bg-vellum p-2.5 pb-10 shadow-[0_14px_30px_-14px_rgb(42_23_18/0.45)]">
      <div className={`aspect-[4/5] bg-gradient-to-br ${tint} to-parchment`} />
      <p className="mt-2 text-center font-display text-sm text-ink-soft italic">{caption}</p>
    </div>
  );
}

export function ImpressionStack() {
  const [spread, setSpread] = useState(false);

  return (
    <section className="paper-grain overflow-hidden py-20 md:py-28" aria-labelledby="impression">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <h2 id="impression" className="max-w-2xl text-4xl text-oxblood md:text-5xl">
          Let your gifts leave an impression
        </h2>
        <p className="mt-4 max-w-md text-ink-soft">The moments our customers have shared with us.</p>

        <LayoutGroup>
          {!spread ? (
            <button
              type="button"
              onClick={() => setSpread(true)}
              className="relative mx-auto mt-14 block h-[340px] w-full max-w-[560px] sm:h-[380px]"
              aria-label="Spread out the customer photos"
            >
              {PHOTOS.map((p, i) => (
                <motion.div
                  key={p.id}
                  layoutId={p.id}
                  className="absolute top-0 left-1/2 -ml-20 w-40 sm:-ml-24 sm:w-48"
                  style={{ zIndex: i }}
                  initial={false}
                  animate={{ rotate: p.rotate, x: p.x }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  <PhotoCard caption={p.caption} tint={p.tint} />
                </motion.div>
              ))}
              <span className="absolute inset-x-0 bottom-0 text-center text-sm text-ink-soft">Tap to see them all</span>
            </button>
          ) : (
            <div className="mt-14">
              <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                {PHOTOS.map((p) => (
                  <motion.li
                    key={p.id}
                    layoutId={p.id}
                    initial={false}
                    animate={{ rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  >
                    <PhotoCard caption={p.caption} tint={p.tint} />
                  </motion.li>
                ))}
              </ul>
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setSpread(false)}
                  className="text-ink-soft underline underline-offset-4 hover:text-oxblood"
                >
                  Stack them again
                </button>
              </div>
            </div>
          )}
        </LayoutGroup>
      </div>
    </section>
  );
}
