"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { MOMENTS } from "@/lib/gallery";
import { MomentMedia } from "../media/MomentMedia";

const SHOWN = MOMENTS.slice(0, 4);

/**
 * A few customer moments as a stack of cards. Tap or click the front card to put
 * it to the back; a clip plays on hover. "See all moments" opens the gallery.
 */
export function MomentsStack() {
  const [order, setOrder] = useState(SHOWN.map((_, i) => i));
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const next = () => setOrder((o) => [...o.slice(1), o[0]]);
  // How far each card sits from the one in front: wider fan where there's room.
  const [step, setStep] = useState(40);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const set = () => setStep(mq.matches ? 74 : 40);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  return (
    <section className="overflow-hidden py-20 md:py-28" aria-labelledby="moments">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 md:grid-cols-[1fr_1.1fr] lg:px-10">
        <div>
          <h2 id="moments" className="max-w-md text-4xl text-ink md:text-5xl">
            Let your gifts leave an impression
          </h2>
          <p className="mt-5 max-w-sm text-ink-soft">
            Moments our customers have shared with us: the unrolling, the reading, the quiet after.
          </p>
          <Link
            href="/about/gallery"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-7 text-vellum transition-colors hover:bg-oxblood"
          >
            See all moments
          </Link>
        </div>

        <div className="relative mx-auto mb-10 h-[400px] w-[230px] -translate-x-[58px] sm:h-[440px] sm:w-[270px] md:-translate-x-[110px]">
          {order.map((idx, depth) => {
            const m = SHOWN[idx];
            const front = depth === 0;
            return (
              <motion.button
                key={m.id}
                type="button"
                onClick={front ? next : undefined}
                tabIndex={front ? 0 : -1}
                aria-hidden={!front}
                aria-label={front ? "Show the next moment" : undefined}
                onPointerEnter={front ? () => setHover(true) : undefined}
                onPointerLeave={front ? () => setHover(false) : undefined}
                className="group absolute inset-x-0 top-0 block rounded-[1.6rem] bg-vellum p-2 text-left shadow-card"
                style={{ zIndex: SHOWN.length - depth, cursor: front ? "pointer" : "default" }}
                initial={false}
                animate={{
                  x: depth * step,
                  y: depth * (step / 3),
                  rotate: depth === 0 ? -4 : -4 + depth * 5,
                  scale: 1 - depth * 0.04,
                }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 28 }}
              >
                <MomentMedia
                  mediaKey={`gallery/${m.id}`}
                  label={m.caption}
                  active={front && hover}
                  tone={idx}
                  className="aspect-[4/5] rounded-[1.2rem]"
                />
                <span className={`flex items-center justify-between gap-3 px-2 pt-3 pb-1.5 transition-opacity ${front ? "" : "opacity-0"}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{m.caption}</span>
                    {m.who && <span className="block truncate text-sm text-ink-soft">{m.who}</span>}
                  </span>
                </span>
              </motion.button>
            );
          })}
          <p className="absolute inset-x-0 -bottom-16 text-center text-sm text-ink-soft">Tap the card to see the next one</p>
        </div>
      </div>
    </section>
  );
}
