"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/** Text added in one go (a draft dropped in) is written out by the pen instead of appearing at once. */
const JUMP = 12;
const MS_PER_CHAR = 14;
const MAX_WRITE_MS = 2600;

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
 * The open scroll with the customer's letter on it. The pen nib sits at the end of the
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

  return (
    <figure className="mx-auto w-full max-w-md px-[4%]" aria-label="Preview of your scroll">
      <Rod />
      <div className="relative -my-2 bg-gradient-to-b from-paper-shade/60 via-parchment to-paper-shade/60 px-[9%] py-8 shadow-card">
        <div className={`min-h-64 font-display leading-relaxed whitespace-pre-wrap text-ink italic ${size}`}>
          {shown ? (
            <>
              {shown}
              <Nib />
            </>
          ) : (
            <span className="text-ink/40">{placeholder}</span>
          )}
        </div>
        <span aria-hidden className="mt-6 ml-auto block h-10 w-10 rounded-full bg-oxblood shadow-[inset_0_-3px_6px_rgb(0_0_0/0.3)]" />
      </div>
      <Rod />
      <figcaption className="sr-only">{text || placeholder}</figcaption>
    </figure>
  );
}
