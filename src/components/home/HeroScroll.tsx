"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { onIntroDone } from "../preloader/intro";

/*
 * PLACEHOLDER ART. When the client's cut-out photos arrive, replace the drawn
 * scroll with the client's film and keep the same reveal: the paper is
 * clipped from the top and the bottom roll travels down with the edge.
 */

const W = 360;
const ROD_Y = 26;
const PAPER_TOP = 34;
const PAPER_FULL = 400; // paper height when fully open

// Gentle hand-written lines on the letter (drawn, not real text).
const LINES = Array.from({ length: 11 }, (_, i) => {
  const y = 92 + i * 30;
  const end = i === 10 ? 170 : 300 - ((i * 37) % 60);
  let d = `M62 ${y}`;
  for (let x = 62; x < end; x += 18) d += ` q9 ${i % 2 ? -4 : -5} 18 0`;
  return d;
});

export function HeroScroll() {
  const progress = useMotionValue(0);
  const paperH = useTransform(progress, [0, 1], [10, PAPER_FULL]);
  const rollY = useTransform(progress, [0, 1], [PAPER_TOP + 4, PAPER_TOP + PAPER_FULL - 6]);

  useEffect(() => {
    // Wait for the intro on a first visit; start at once on repeat views.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      progress.set(1);
      return;
    }
    let a: ReturnType<typeof animate> | undefined;
    const stop = onIntroDone(() => {
      a = animate(progress, 1, { delay: 0.15, duration: 1.7, ease: [0.65, 0, 0.35, 1] });
    });
    return () => {
      stop();
      a?.stop();
    };
  }, [progress]);

  return (
    <div className="relative mx-auto w-full">
      <svg viewBox={`0 0 ${W} 470`} className="w-full overflow-visible" role="img" aria-label="A parchment scroll unrolling">
        <defs>
          <clipPath id="paper-clip">
            <motion.rect x="0" y={PAPER_TOP} width={W} height={paperH} />
          </clipPath>
          <linearGradient id="rod" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-wood)" />
            <stop offset="0.5" stopColor="var(--color-wood-dark)" />
            <stop offset="1" stopColor="var(--color-wood)" />
          </linearGradient>
          <linearGradient id="roll" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-paper-shade)" />
            <stop offset="0.45" stopColor="var(--color-vellum)" />
            <stop offset="1" stopColor="var(--color-paper-shade)" />
          </linearGradient>
          <linearGradient id="paper-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--color-paper-shade)" stopOpacity="0.9" />
            <stop offset="0.08" stopColor="var(--color-vellum)" stopOpacity="0" />
            <stop offset="0.92" stopColor="var(--color-vellum)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--color-paper-shade)" stopOpacity="0.9" />
          </linearGradient>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="var(--color-ink)" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* Paper */}
        <g clipPath="url(#paper-clip)" filter="url(#soft-shadow)">
          <path
            d={`M40 ${PAPER_TOP} H320 C322 120 316 230 322 ${PAPER_TOP + PAPER_FULL} H38 C42 300 36 170 40 ${PAPER_TOP} Z`}
            fill="var(--color-vellum)"
          />
          <rect x="36" y={PAPER_TOP} width="290" height={PAPER_FULL} fill="url(#paper-edge)" />
          <g fill="none" stroke="var(--color-oxblood)" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round">
            <path d="M62 62 q10 -12 22 0 t22 0" strokeWidth="1.8" />
            {LINES.map((d, i) => (
              <path key={i} d={d} />
            ))}
            <path d="M210 446 q14 -16 30 -2 q10 8 26 -6" strokeWidth="1.8" />
          </g>
        </g>

        {/* Bottom roll travels down with the opening edge */}
        <motion.g style={{ y: rollY }}>
          <rect x="30" y="-10" width="300" height="22" rx="11" fill="url(#roll)" />
          <rect x="30" y="-10" width="300" height="22" rx="11" fill="none" stroke="var(--color-paper-shade)" />
        </motion.g>

        {/* Top rod with knobs */}
        <g>
          <rect x="22" y={ROD_Y - 7} width="316" height="14" rx="7" fill="url(#rod)" />
          <circle cx="16" cy={ROD_Y} r="10" fill="var(--color-wood-dark)" />
          <circle cx="344" cy={ROD_Y} r="10" fill="var(--color-wood-dark)" />
          <circle cx="13" cy={ROD_Y - 3} r="3" fill="var(--color-wood)" />
          <circle cx="341" cy={ROD_Y - 3} r="3" fill="var(--color-wood)" />
        </g>

      </svg>
    </div>
  );
}
