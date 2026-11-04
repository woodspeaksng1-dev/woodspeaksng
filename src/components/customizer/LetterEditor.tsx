"use client";

import { useState } from "react";
import { clampWords, countWords } from "@/lib/format";
import { draftLetters } from "@/lib/drafts";
import { AssistForm } from "./AssistForm";
import { ModeToggle, type WriteMode } from "./ModeToggle";

/** The letter for the scroll: typed by hand, or picked from the wizard's three drafts and edited. */
export function LetterEditor({
  text,
  onChange,
  maxWords,
}: {
  text: string;
  onChange: (text: string) => void;
  maxWords: number;
}) {
  const [mode, setMode] = useState<WriteMode>("manual");
  const [options, setOptions] = useState<string[]>([]);
  const words = countWords(text);

  return (
    <div className="flex flex-col gap-5">
      <ModeToggle mode={mode} onChange={setMode} />

      {mode === "assisted" && (
        <>
          <AssistForm withTone submitLabel="Write three options" onSubmit={async (req) => setOptions(await draftLetters(req))} />
          {options.length > 0 && (
            <ol className="flex flex-col gap-3" aria-label="Draft messages">
              {options.map((o, i) => (
                <li key={i} className="rounded-2xl border border-rule bg-vellum p-4">
                  <p className="text-xs text-ink-soft">
                    Option {i + 1} · {countWords(o)} words
                  </p>
                  {/* Letters run close to 300 words: a short scrolling box keeps all three in reach on phones. */}
                  <p tabIndex={0} className="mt-2 max-h-48 overflow-y-auto pr-2 text-sm whitespace-pre-line text-ink">
                    {o}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(clampWords(o, maxWords));
                      // On phones the preview sits above: bring it into view to watch the pen write.
                      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                      document.getElementById("customizer-preview")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
                    }}
                    className="mt-3 h-10 rounded-full border border-oxblood px-5 text-sm text-oxblood transition-colors hover:bg-oxblood hover:text-vellum"
                  >
                    Use this
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <div>
        <label htmlFor="letter" className="font-display text-xl text-oxblood">
          Your letter
        </label>
        <textarea
          id="letter"
          value={text}
          onChange={(e) => onChange(clampWords(e.target.value, maxWords))}
          rows={9}
          placeholder="My dearest…"
          aria-describedby="letter-count"
          className="mt-2 w-full rounded-2xl border border-rule bg-vellum p-4 text-ink outline-none focus:border-oxblood"
        />
        <p id="letter-count" aria-live="polite" className={`mt-1 text-right text-sm tabular-nums ${words >= maxWords ? "text-oxblood" : "text-ink-soft"}`}>
          {words} of {maxWords} words{words >= maxWords && " (that's the limit)"}
        </p>
      </div>
    </div>
  );
}
