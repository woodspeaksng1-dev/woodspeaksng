"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

// Irregular poured-wax edge: a circle with a deterministic wobble.
const EDGE = (() => {
  const pts: string[] = [];
  const n = 56;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 90 + Math.sin(i * 1.7) * 2.6 + Math.sin(i * 0.55 + 1) * 3.4 + (i % 9 === 0 ? 4.5 : 0);
    pts.push(`${(100 + Math.cos(a) * r).toFixed(1)} ${(100 + Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
})();

/**
 * The hero call to action: a pressed wax seal reading "Shop now".
 * With `image` (the client's seal photo, cut out on a transparent background, words
 * included) the photo is the whole seal. Without it, the wax and words are drawn with
 * SVG lighting so it reads as a real raised seal rather than a flat badge.
 */
export function WaxSeal({
  className = "",
  image,
  label = "Shop now",
  href = "/shop",
}: {
  className?: string;
  image?: string | null;
  label?: string;
  href?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (s: string) => `${s}-${uid}`;
  const [first, second] = label.split(" ");
  const reduce = useReducedMotion();
  const [held, setHeld] = useState(false);

  return (
    <Link
      href={href}
      className={`group block rounded-full outline-offset-8 ${className}`}
      aria-label={label}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      {/* Breathing: a slow swell and settle, with a small tilt, every few seconds so the
          eye reads it as something to press. It stops while hovered or focused. */}
      <motion.div
        className="h-full w-full"
        animate={reduce || held ? { scale: 1, rotate: 0 } : { scale: [1, 1.055, 1, 1.03, 1], rotate: [0, -1.5, 0, 1, 0] }}
        transition={
          reduce || held
            ? { duration: 0.3 }
            : { duration: 1.6, times: [0, 0.3, 0.55, 0.75, 1], ease: "easeInOut", repeat: Infinity, repeatDelay: 2.2, delay: 2.6 }
        }
      >
      <motion.div
        className="relative h-full w-full"
        whileHover={{ rotate: -3, scale: 1.03 }}
        whileTap={{ scale: 0.93, rotate: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
      >
        {/* Contact shadow on the paper; it tightens as the seal is pressed. */}
        <span
          aria-hidden
          className="absolute inset-x-[8%] bottom-[-3%] h-[22%] rounded-[50%] bg-ink/35 blur-md transition-transform duration-200 group-active:scale-90"
        />
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="relative h-full w-full object-contain" />
        ) : (
        <svg viewBox="0 0 200 200" className="relative h-full w-full overflow-visible">
          <defs>
            <radialGradient id={id("wax")} cx="0.36" cy="0.3" r="0.8">
              <stop offset="0" stopColor="var(--color-wine)" />
              <stop offset="0.55" stopColor="var(--color-oxblood)" />
              <stop offset="1" stopColor="var(--color-oxblood-deep)" />
            </radialGradient>
            {/* Raised wax: blurred alpha used as a height map, lit from the top left. */}
            <filter id={id("raised")} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="noise" />
              <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
              <feComposite in="blur" in2="noise" operator="arithmetic" k2="1" k3="0.18" result="height" />
              <feSpecularLighting in="height" surfaceScale="5" specularConstant="0.75" specularExponent="22" lightingColor="white" result="spec">
                <fePointLight x="30" y="10" z="140" />
              </feSpecularLighting>
              <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
              <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k2="1" k3="0.55" />
            </filter>
            {/* The stamped hollow: shadow on the upper-left inner edge, light on the lower right. */}
            <filter id={id("hollow")} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="b" />
              <feOffset in="b" dx="2.4" dy="3" result="o" />
              <feComposite in="SourceAlpha" in2="o" operator="out" result="inner" />
              <feFlood floodColor="var(--color-oxblood-deep)" floodOpacity="0.9" />
              <feComposite in2="inner" operator="in" result="shade" />
              <feOffset in="b" dx="-1.6" dy="-2" result="o2" />
              <feComposite in="SourceAlpha" in2="o2" operator="out" result="inner2" />
              <feFlood floodColor="white" floodOpacity="0.22" />
              <feComposite in2="inner2" operator="in" result="lit" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="lit" />
                <feMergeNode in="shade" />
              </feMerge>
            </filter>
            {/* Gilded letters raised out of the hollow. */}
            <filter id={id("gilt")} x="-10%" y="-20%" width="120%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" result="b" />
              <feSpecularLighting in="b" surfaceScale="2" specularConstant="0.9" specularExponent="16" lightingColor="white" result="s">
                <fePointLight x="40" y="20" z="90" />
              </feSpecularLighting>
              <feComposite in="s" in2="SourceAlpha" operator="in" result="si" />
              <feOffset in="SourceAlpha" dx="0.8" dy="1.2" result="drop" />
              <feFlood floodColor="var(--color-oxblood-deep)" floodOpacity="0.85" />
              <feComposite in2="drop" operator="in" result="dropC" />
              <feMerge>
                <feMergeNode in="dropC" />
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="si" />
              </feMerge>
            </filter>
            <linearGradient id={id("gold")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--color-gold-light)" />
              <stop offset="1" stopColor="var(--color-gold)" />
            </linearGradient>
            <path id={id("ring")} d="M100 100 m-56 0 a56 56 0 1 1 112 0 a56 56 0 1 1 -112 0" />
          </defs>

          {!image && (
            <>
              <path d={EDGE} fill={`url(#${id("wax")})`} filter={`url(#${id("raised")})`} />
              <circle cx="100" cy="100" r="68" fill="var(--color-oxblood)" filter={`url(#${id("hollow")})`} />
            </>
          )}

          <g filter={`url(#${id("gilt")})`} fill={`url(#${id("gold")})`}>
            <text fontFamily="var(--font-display)" fontSize="10.5" letterSpacing="2.1" opacity="0.9">
              <textPath href={`#${id("ring")}`} startOffset="0">
                WOODSPEAKS · A PLACE FOR EMOTIONS ·
              </textPath>
            </text>
            <text x="100" y={second ? 97 : 110} textAnchor="middle" fontFamily="var(--font-display)" fontStyle="italic" fontSize="31">
              {first}
            </text>
            {second && (
              <text x="100" y="127" textAnchor="middle" fontFamily="var(--font-display)" fontStyle="italic" fontSize="31">
                {second}
              </text>
            )}
          </g>
        </svg>
        )}
      </motion.div>
      </motion.div>
    </Link>
  );
}
