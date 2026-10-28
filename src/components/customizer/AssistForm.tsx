"use client";

import { useState } from "react";
import { OCCASION_LABELS } from "@/lib/catalog";
import { DRAFT_LIMIT, DRAFT_TONE, DRAFT_WHO, draftsUsed, type DraftRequest, type DraftTone, type DraftWho } from "@/lib/drafts";
import type { Occasion } from "@/lib/types";
import { Chips } from "../ui/Chips";

const NOTE_MAX = 150;

/**
 * The wizard's questions for "Help me write it": who, occasion, tone (letters only)
 * and an optional short note. Calls `onSubmit` with the answers; the caller drafts.
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
  const [note, setNote] = useState("");
  const [used, setUsed] = useState(draftsUsed);
  const atLimit = used >= DRAFT_LIMIT;
  const ready = who && occasion && tone;

  return (
    <div className="rounded-2xl border border-rule bg-vellum p-5">
      <Chips label="Who is it for?" options={DRAFT_WHO} value={who} onChange={setWho} />
      <Chips label="What's the occasion?" options={OCCASION_LABELS} value={occasion} onChange={setOccasion} />
      {withTone && <Chips label="How should it sound?" options={DRAFT_TONE} value={tone} onChange={setTone} />}
      <label className="mt-4 block text-sm text-ink-soft" htmlFor="assist-note">
        Anything we should mention? (optional, no names needed)
      </label>
      <input
        id="assist-note"
        value={note}
        maxLength={NOTE_MAX}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. we met at university, she loves gardening"
        className="mt-2 h-11 w-full rounded-xl border border-rule bg-parchment/40 px-3 text-ink outline-none focus:border-oxblood"
      />
      <p className="mt-1 text-right text-xs text-ink-soft tabular-nums">
        {note.length}/{NOTE_MAX}
      </p>
      {atLimit ? (
        <p className="mt-3 text-sm text-ink-soft">
          That&rsquo;s all the drafts I can write for this visit. Edit one of the options above, or write your own.
        </p>
      ) : (
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            if (!who || !occasion || !tone) return;
            onSubmit({ who, occasion, tone, note: note.trim() || undefined });
            setUsed(draftsUsed());
          }}
          className="mt-3 h-11 w-full rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitLabel}
        </button>
      )}
    </div>
  );
}
