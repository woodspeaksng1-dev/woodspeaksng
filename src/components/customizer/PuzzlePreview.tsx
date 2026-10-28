/** The twenty puzzle cards, filling in as reasons are typed. */
export function PuzzlePreview({ reasons }: { reasons: string[] }) {
  return (
    <figure aria-label="Preview of your puzzle" className="mx-auto w-full max-w-md rounded-[1.4rem] bg-wood-dark p-2.5 shadow-card">
      <ol className="grid grid-cols-4 gap-1.5">
        {reasons.map((r, i) => (
          <li
            key={i}
            className={`flex aspect-[4/5] flex-col rounded-md p-1.5 text-center ${r.trim() ? "bg-parchment" : "bg-parchment/45"}`}
          >
            <span className="font-display text-xs text-oxblood">{i + 1}</span>
            <span className="flex flex-1 items-center justify-center font-display text-[0.62rem] leading-tight text-ink italic sm:text-xs">
              {r.trim()}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
