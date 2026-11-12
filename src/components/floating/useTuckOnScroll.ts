"use client";

import { useEffect, useState } from "react";

/**
 * True while the visitor is scrolling down the page (past the first screen), so the floating helpers
 * can step aside instead of covering prices and photos. They come back on any scroll up, and near the
 * top or bottom of the page. Callers apply it on phones only.
 */
export function useTuckOnScroll(enabled = true): boolean {
  const [tucked, setTucked] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const nearEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 120;
        if (y < 200 || nearEnd) setTucked(false);
        else if (y > last + 8) setTucked(true);
        else if (y < last - 8) setTucked(false);
        if (Math.abs(y - last) > 8) last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return enabled && tucked;
}

/** Classes for a floating helper's wrapper: slides off the given side on phones while tucked. */
export const tuckClasses = (tucked: boolean, side: "left" | "right") =>
  `transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none ${
    tucked ? `max-md:pointer-events-none max-md:opacity-0 ${side === "left" ? "max-md:-translate-x-24" : "max-md:translate-x-24"}` : ""
  }`;
