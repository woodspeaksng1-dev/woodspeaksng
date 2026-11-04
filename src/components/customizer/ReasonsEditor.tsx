"use client";

import { useState } from "react";
import { clampWords, formatNaira } from "@/lib/format";
import { draftReasons } from "@/lib/drafts";
import { AssistForm } from "./AssistForm";
import { ModeToggle, type WriteMode } from "./ModeToggle";

export type ReasonsMode = "standard" | "custom";

/** "20 Reasons": our printed reasons, or the customer's own (typed, or drafted by the wizard and edited). */
export function ReasonsEditor({
  mode,
  onModeChange,
  reasons,
  onChange,
  price,
  fee,
  maxWordsEach,
}: {
  mode: ReasonsMode;
  onModeChange: (m: ReasonsMode) => void;
  reasons: string[];
  onChange: (reasons: string[]) => void;
  price: number;
  fee: number;
  maxWordsEach: number;
}) {
  const [writeMode, setWriteMode] = useState<WriteMode>("manual");
  const filled = reasons.filter((r) => r.trim()).length;

  const choice = (value: ReasonsMode, title: string, note: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === value}
      onClick={() => onModeChange(value)}
      className={`flex flex-1 flex-col rounded-2xl border p-4 text-left transition-colors ${
        mode === value ? "border-oxblood bg-vellum ring-1 ring-oxblood" : "border-rule bg-vellum/60 hover:border-oxblood"
      }`}
    >
      <span className="font-display text-lg text-oxblood">{title}</span>
      <span className="mt-1 text-sm text-ink-soft">{note}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Which reasons?" className="flex flex-col gap-3 sm:flex-row">
        {choice("standard", "Our 20 reasons", `${formatNaira(price)}. Printed for you, nothing to write.`)}
        {choice("custom", "Write your own", `${formatNaira(price + fee)}. Your 20 reasons, ${maxWordsEach} words each.`)}
      </div>

      {mode === "custom" && (
        <>
          <ModeToggle mode={writeMode} onChange={setWriteMode} />
          {writeMode === "assisted" && (
            <AssistForm
              withTone={false}
              submitLabel="Draft all 20 reasons"
              onSubmit={async (req) => onChange((await draftReasons(req, reasons.length)).map((r) => clampWords(r, maxWordsEach)))}
            />
          )}
          <fieldset>
            <legend className="flex w-full items-baseline justify-between gap-4">
              <span className="font-display text-xl text-oxblood">Your reasons</span>
              <span aria-live="polite" className="text-sm text-ink-soft tabular-nums">
                {filled} of {reasons.length} written
              </span>
            </legend>
            <ol className="mt-3 flex flex-col gap-2">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-center gap-3">
                  <label htmlFor={`reason-${i}`} className="w-6 shrink-0 text-right font-display text-oxblood tabular-nums">
                    {i + 1}
                  </label>
                  <input
                    id={`reason-${i}`}
                    value={r}
                    onChange={(e) => onChange(reasons.map((x, j) => (j === i ? clampWords(e.target.value, maxWordsEach) : x)))}
                    placeholder={`Up to ${maxWordsEach} words`}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-rule bg-vellum px-3 text-ink outline-none focus:border-oxblood"
                  />
                </li>
              ))}
            </ol>
          </fieldset>
        </>
      )}
    </div>
  );
}
