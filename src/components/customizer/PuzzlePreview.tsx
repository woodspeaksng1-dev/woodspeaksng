// One puzzle card, heart shaped like the real pieces (viewBox 0 0 100 92).
const HEART = "M50 90C20 68 2 50 2 28 2 13 14 2 28 2c10 0 18 6 22 14 4-8 12-14 22-14 14 0 26 11 26 26 0 22-18 40-48 62Z";

/** The twenty puzzle cards, filling in as reasons are typed. */
export function PuzzlePreview({ reasons }: { reasons: string[] }) {
  return (
    <figure aria-label="Preview of your puzzle" className="mx-auto w-full max-w-md rounded-[1.4rem] bg-wood-dark p-2.5 shadow-card">
      <ol className="grid grid-cols-4 gap-1">
        {reasons.map((r, i) => (
          <li key={i} className="relative aspect-[100/92]">
            <svg aria-hidden viewBox="0 0 100 92" className="absolute inset-0 h-full w-full">
              <path d={HEART} className={r.trim() ? "fill-parchment" : "fill-parchment/45"} />
            </svg>
            {/* Text sits in the wide upper part of the heart, clear of the point. */}
            <span className="absolute inset-x-[9%] top-[14%] bottom-[26%] flex flex-col items-center justify-center text-center">
              <span className="font-display text-[0.6rem] leading-none text-oxblood sm:text-xs">{i + 1}</span>
              <span className="mt-0.5 font-display text-[0.55rem] leading-tight text-ink italic sm:text-[0.68rem]">
                {r.trim()}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
