"use client";

import { useEffect, useRef, useState } from "react";
import { WORDMARK } from "./wordmark-data";

const WRITE_MS = 2000; // pen writing
const HOLD_MS = 250; // finished wordmark rests
const FADE_MS = 350; // overlay fades out
const STROKE = 13; // reveal width around each letter outline, in wordmark units
/** When the intro starts to fade on a first visit; the hero enters on this cue. */
export const INTRO_MS = WRITE_MS + HOLD_MS;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Where the first stroke starts, so the pen waits there before the script runs.
const [START_X, START_Y] = (WORDMARK.contours[0].match(/^M\s*([\d.-]+)[ ,]([\d.-]+)/)?.slice(1) ?? ["0", "0"]).map(Number);

/**
 * Intro: a calligraphy pen writes the wordmark, then the page appears.
 * - Plays once per visit (browser tab session), on whichever page comes first; the page renders
 *   underneath while it plays.
 * - The server sends the wordmark unwritten (pathLength 1, dash offset 1, strokes hidden) so a
 *   slow phone never sees it finished before the pen moves.
 * - Not skippable by tapping (client request).
 * - Reduce-motion users see the finished wordmark briefly instead of the animation.
 * - A CSS failsafe in globals hides it after 4 s even if this script never runs.
 */
export function Preloader() {
  const [state, setState] = useState<"playing" | "leaving" | "done">("playing");
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const nibRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    // Skipped by the intro script in the layout: CSS hides the overlay, nothing to animate.
    if (html.dataset.intro === "seen") return;

    html.style.overflow = "hidden";
    const finish = () => {
      html.style.overflow = "";
      setState("leaving");
      try {
        sessionStorage.setItem("ws-intro", "1");
      } catch {}
      window.setTimeout(() => {
        html.dataset.intro = "seen";
        setState("done");
      }, FADE_MS);
    };

    const paths = pathRefs.current.filter((p): p is SVGPathElement => !!p);
    const lengths = paths.map((p) => p.getTotalLength());
    const total = lengths.reduce((a, b) => a + b, 0);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      paths.forEach((p) => {
        p.style.strokeDashoffset = "0";
        p.style.visibility = "visible";
      });
      if (nibRef.current) nibRef.current.style.opacity = "0";
      const t = window.setTimeout(finish, 700);
      return () => window.clearTimeout(t);
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = easeInOut(Math.min(1, (now - start) / WRITE_MS));
      let drawn = progress * total;
      let nibPoint: DOMPoint | null = null;

      for (let i = 0; i < paths.length; i++) {
        const len = lengths[i];
        const visible = Math.max(0, Math.min(len, drawn));
        paths[i].style.strokeDashoffset = `${1 - visible / len}`;
        // A stroke not yet started stays hidden: its round cap would otherwise show as a dot.
        paths[i].style.visibility = visible > 0 ? "visible" : "hidden";
        if (!nibPoint && drawn < len) nibPoint = paths[i].getPointAtLength(Math.max(0, visible));
        drawn -= len;
      }

      if (nibRef.current) {
        if (nibPoint) {
          nibRef.current.setAttribute("transform", `translate(${nibPoint.x} ${nibPoint.y})`);
        } else {
          nibRef.current.style.opacity = "0";
        }
      }

      if (progress < 1) raf = requestAnimationFrame(tick);
      else window.setTimeout(finish, HOLD_MS);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (state === "done") return null;

  return (
    <div
      className="ws-preloader fixed inset-0 z-[100] flex items-center justify-center bg-oxblood-deep transition-opacity ease-out"
      style={{ opacity: state === "leaving" ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
      role="presentation"
      aria-hidden="true"
    >
      <svg viewBox={WORDMARK.viewBox} className="w-[78vw] max-w-[560px] overflow-visible">
        <defs>
          <mask id="ws-ink" maskUnits="userSpaceOnUse">
            {WORDMARK.contours.map((d, i) => (
              <path
                key={i}
                ref={(el) => {
                  pathRefs.current[i] = el;
                }}
                d={d}
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1}
                visibility="hidden"
                fill="none"
                stroke="white"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </mask>
        </defs>
        <path d={WORDMARK.contours.join("")} fill="var(--color-gold-light)" mask="url(#ws-ink)" />
        {/* Calligraphy nib; its tip sits at the origin so it follows the ink. */}
        <g ref={nibRef} transform={`translate(${START_X} ${START_Y})`} className="transition-opacity duration-200">
          <g transform="rotate(-38)">
            <path
              d="M0 0 L-5 -22 Q-6 -34 0 -40 Q6 -34 5 -22 Z"
              fill="var(--color-gold-light)"
              stroke="var(--color-oxblood-deep)"
              strokeWidth="0.8"
            />
            <line x1="0" y1="-3" x2="0" y2="-24" stroke="var(--color-oxblood-deep)" strokeWidth="0.9" />
            <circle cx="0" cy="-26" r="1.6" fill="var(--color-oxblood-deep)" />
            <rect x="-6" y="-120" width="12" height="82" rx="3" fill="var(--color-ink)" stroke="var(--color-gold-light)" strokeWidth="0.8" />
          </g>
        </g>
      </svg>
    </div>
  );
}
