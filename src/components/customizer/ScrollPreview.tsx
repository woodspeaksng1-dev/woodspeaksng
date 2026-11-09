"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { imageSrc } from "@/lib/media";

/** Text added in one go (a draft dropped in) is written out by the pen instead of appearing at once. */
const JUMP = 12;
const MS_PER_CHAR = 14;
const MAX_WRITE_MS = 2600;

// The rod and the curled foot are cut from the last frame of the hero film (opaque, on the parchment
// colour like the film: recut them if `--color-parchment` changes). The sheet between them is CSS
// (`.scroll-sheet`) so it grows with the letter; its side margins line up with the photo's paper edges.
const TOP = imageSrc("customizer/scroll-top");
const FOOT = imageSrc("customizer/scroll-bottom");

function Rod() {
  return (
    <div aria-hidden className="relative z-10 mx-[-4%] flex h-5 items-center">
      <span className="h-5 w-5 shrink-0 rounded-full bg-wood-dark" />
      <span className="h-3.5 flex-1 rounded-full bg-gradient-to-b from-wood to-wood-dark" />
      <span className="h-5 w-5 shrink-0 rounded-full bg-wood-dark" />
    </div>
  );
}

function Nib() {
  return (
    <svg aria-hidden viewBox="-8 -44 16 46" className="ml-0.5 inline-block h-6 w-3 -rotate-[38deg] align-baseline text-gold">
      <path d="M0 0 L-5 -22 Q-6 -34 0 -40 Q6 -34 5 -22 Z" fill="currentColor" stroke="var(--color-ink)" strokeWidth="0.8" />
      <line x1="0" y1="-3" x2="0" y2="-24" stroke="var(--color-ink)" strokeWidth="0.9" />
      <circle cx="0" cy="-26" r="1.6" fill="var(--color-ink)" />
    </svg>
  );
}

/**
 * The open scroll with the customer's letter on it, drawn like the real one in the hero film. The pen nib sits at the end of the
 * text and moves with it as they type; a whole draft is written out character by character.
 * With reduced motion the text appears at once.
 */
export function ScrollPreview({ text, placeholder }: { text: string; placeholder: string }) {
  const reduceMotion = useReducedMotion();
  const prev = useRef(text);
  const [writing, setWriting] = useState<{ target: string; shown: number } | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = text;
    if (reduceMotion || !text.startsWith(before) || text.length - before.length < JUMP) return;

    const from = before.length;
    const duration = Math.min(MAX_WRITE_MS, (text.length - from) * MS_PER_CHAR);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setWriting(t < 1 ? { target: text, shown: from + Math.round((text.length - from) * t) } : null);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, reduceMotion]);

  const shown = writing && writing.target === text ? text.slice(0, writing.shown) : text;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const size = words > 200 ? "text-[0.8rem]" : words > 110 ? "text-sm" : words > 50 ? "text-base" : "text-lg";

  const letter = (
    <div className={`min-h-40 font-display md:min-h-64 leading-relaxed whitespace-pre-wrap text-ink italic ${size}`}>
      {shown ? (
        <>
          {shown}
          <Nib />
        </>
      ) : (
        <span className="text-ink/55">{placeholder}</span>
      )}
    </div>
  );

  if (TOP && FOOT)
    return (
      <figure className="mx-auto w-full max-w-md" aria-label="Preview of your scroll">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={TOP}
          alt=""
          width={726}
          height={130}
          className="relative z-10 block w-full [mask-image:linear-gradient(to_bottom,black_88%,transparent)]"
        />
        <div className="scroll-sheet relative mt-[-2.2%] mr-[13.8%] ml-[13.5%] px-[9%] pt-[6%] pb-[4%]">
          {letter}
          {/* Wax stamp with a "W", like the stamp on the real scrolls. */}
          <span
            aria-hidden
            className="mt-5 ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-oxblood shadow-[inset_0_-3px_6px_rgb(0_0_0/0.35),0_3px_4px_rgb(42_23_18/0.3)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-wine">
              <span className="font-display text-2xl leading-none text-wine [text-shadow:0_-1px_0_rgb(0_0_0/0.4)]">W</span>
            </span>
          </span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FOOT}
          alt=""
          width={726}
          height={75}
          className="relative z-10 -mt-[3%] block w-full [mask-image:linear-gradient(to_bottom,transparent,black_30%)]"
        />
        <figcaption className="sr-only">{text || placeholder}</figcaption>
      </figure>
    );

  // Drawn fallback while the photographed pieces are missing.
  return (
    <figure className="mx-auto w-full max-w-md px-[4%]" aria-label="Preview of your scroll">
      <Rod />
      <div className="relative -my-2 bg-gradient-to-b from-paper-shade/60 via-parchment to-paper-shade/60 px-[9%] py-8 shadow-card">
        {letter}
        <span aria-hidden className="mt-6 ml-auto block h-10 w-10 rounded-full bg-oxblood shadow-[inset_0_-3px_6px_rgb(0_0_0/0.3)]" />
      </div>
      <Rod />
      <figcaption className="sr-only">{text || placeholder}</figcaption>
    </figure>
  );
}
