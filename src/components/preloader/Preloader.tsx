import { INTRO_FADE_MS } from "./intro";
import { WORDMARK } from "./wordmark-data";

const STROKE = 13; // reveal width around each letter outline, in wordmark units

// Where the first stroke starts, so the pen waits there until the intro script runs.
const [START_X, START_Y] = (WORDMARK.contours[0].match(/^M\s*([\d.-]+)[ ,]([\d.-]+)/)?.slice(1) ?? ["0", "0"]).map(Number);

/**
 * Intro: a calligraphy pen writes the wordmark, then the page appears.
 * - Markup only. The intro script in the page head (`intro.ts`) animates it as soon as it arrives,
 *   without waiting for the React bundle, which can take seconds on mobile data.
 * - Plays once per visit (browser tab session), on whichever page comes first; the page renders
 *   underneath while it plays.
 * - Sent unwritten (pathLength 1, dash offset 1, strokes hidden) so it never shows finished first.
 * - Not skippable by tapping (client request). Reduce-motion users see the finished wordmark briefly.
 * - A CSS failsafe in globals hides it after 4 s if the script never runs.
 * The script changes these elements' styles, hence `suppressHydrationWarning`.
 */
export function Preloader() {
  return (
    <div
      className="ws-preloader fixed inset-0 z-[100] flex items-center justify-center bg-oxblood-deep transition-opacity ease-out"
      style={{ transitionDuration: `${INTRO_FADE_MS}ms` }}
      role="presentation"
      aria-hidden="true"
      suppressHydrationWarning
    >
      <svg viewBox={WORDMARK.viewBox} className="w-[78vw] max-w-[560px] overflow-visible">
        <defs>
          <mask id="ws-ink" maskUnits="userSpaceOnUse">
            {WORDMARK.contours.map((d, i) => (
              <path
                key={i}
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
                suppressHydrationWarning
              />
            ))}
          </mask>
        </defs>
        <path d={WORDMARK.contours.join("")} fill="var(--color-gold-light)" mask="url(#ws-ink)" />
        {/* Calligraphy nib; its tip sits at the origin so it follows the ink. */}
        <g
          data-nib
          transform={`translate(${START_X} ${START_Y})`}
          className="transition-opacity duration-200"
          suppressHydrationWarning
        >
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
