"use client";

import { useState } from "react";
import { OCCASION_LABELS } from "@/lib/catalog";
import { DRAFT_TONE, DRAFT_WHO, type DraftRequest, type DraftTone, type DraftWho } from "@/lib/drafts";
import type { Occasion } from "@/lib/types";
import { Chips } from "../ui/Chips";

// Romantic is for partners only; a romantic letter to a parent or colleague would read wrong.
// (Chips only lists the keys present, so the narrower set is typed as the full one.)
const TONE_NOT_ROMANTIC = Object.fromEntries(
  Object.entries(DRAFT_TONE).filter(([key]) => key !== "romantic"),
) as Record<DraftTone, string>;

/**
 * Mudi's questions for "Help me write it": who, occasion and tone (letters only).
 * Calls `onSubmit` with the answers; the caller drafts. Always reminds the buyer to proofread
 * and personalise the draft, since we print exactly what they send.
 */
export function AssistForm({
  withTone,
  submitLabel,
  onSubmit,
}: {
  withTone: boolean;
  submitLabel: string;
  onSubmit: (req: DraftRequest) => void;
}) {
  const [who, setWho] = useState<DraftWho | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [tone, setTone] = useState<DraftTone | null>(withTone ? null : "heartfelt");
  const ready = who && occasion && tone;

  return (
    <div className="rounded-2xl border border-rule bg-vellum p-5">
      <p className="font-display text-lg text-oxblood">Mudi will draft it for you</p>
      <Chips
        label="Who is it for?"
        options={DRAFT_WHO}
        value={who}
        onChange={(next) => {
          setWho(next);
          if (next !== "partner" && tone === "romantic") setTone(null);
        }}
      />
      <Chips label="What's the occasion?" options={OCCASION_LABELS} value={occasion} onChange={setOccasion} />
      {withTone && (
        <Chips
          label="How should it sound?"
          options={who === "partner" ? DRAFT_TONE : TONE_NOT_ROMANTIC}
          value={tone}
          onChange={setTone}
        />
      )}
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          if (!who || !occasion || !tone) return;
          onSubmit({ who, occasion, tone });
        }}
        className="mt-3 h-11 w-full rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitLabel}
      </button>
      <p className="mt-4 rounded-xl bg-parchment/70 p-3 text-sm text-ink">
        <strong className="font-semibold">Proofread and personalise what Mudi writes.</strong> It&rsquo;s a starting
        point: add names, your own memories and the little details only you know, and check every word. We print
        exactly what you send.
      </p>
    </div>
  );
}
