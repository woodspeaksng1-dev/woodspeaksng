import type { LetterOccasion } from "./draft-library";
import type { Occasion } from "./types";

/*
 * "Help me write it": drafts mixed from a curated writing library (`draft-library.ts`), in the
 * browser, with no AI and no server call. The client chose this over Gemini (4 Nov).
 */

export const DRAFT_WHO = {
  partner: "My partner",
  parent: "A parent",
  friend: "A friend",
  colleague: "A colleague or client",
} as const;

export const DRAFT_TONE = {
  heartfelt: "Heartfelt",
  romantic: "Romantic",
  playful: "Playful",
  grateful: "Grateful",
} as const;

export type DraftWho = keyof typeof DRAFT_WHO;
export type DraftTone = keyof typeof DRAFT_TONE;

export interface DraftRequest {
  who: DraftWho;
  occasion: Occasion;
  tone: DraftTone;
}

/** Shuffled copy (Fisher-Yates), so each request draws a fresh mix from the library. */
function shuffled<T>(pool: readonly T[]): T[] {
  const out = [...pool];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Three letter options for the scroll, each at most 300 words (the library's word budgets guarantee it).
 * Every part is drawn at random without repeats, so the three options never share a paragraph and
 * asking again with the same answers gives new letters.
 */
export async function draftLetters({ who, occasion, tone }: DraftRequest): Promise<string[]> {
  const lib = await import("./draft-library");
  const key: LetterOccasion =
    occasion === "anniversary" || occasion === "wedding"
      ? `${occasion}-${who === "partner" ? "ours" : "yours"}`
      : occasion;
  // Romantic is only offered for partners; fall back to heartfelt if it ever arrives for anyone else.
  const voice = tone === "romantic" && who !== "partner" ? "heartfelt" : tone;
  const openings = shuffled(lib.OPENINGS[key]);
  const bodies = shuffled(lib.BODIES[voice]);
  const about = shuffled(lib.ABOUT_YOU[who]);
  const wishes = shuffled(lib.WISHES[key]);
  const closings = shuffled(lib.CLOSINGS[who]);
  return [0, 1, 2].map((i) =>
    [openings[i], bodies[i], about[2 * i], about[2 * i + 1], wishes[i], closings[i]].join("\n\n"),
  );
}

const PROVISIONAL_STANDARD = [
  "Your laugh fills every room",
  "You make ordinary days special",
  "You believe in my dreams",
  "Your hugs fix bad days",
  "You listen without judging me",
  "You make me a better person",
  "Your kindness to strangers",
  "How you say my name",
  "You remember the little things",
  "You dance badly with confidence",
  "Your patience when I'm stressed",
  "Our late-night conversations",
  "You are my safe place",
  "You make me laugh daily",
  "Your sleepy morning voice",
  "You chose me",
  "You never give up on us",
  "Your terrible jokes, honestly",
  "You always save me food",
  "Every day feels like home",
];

/**
 * The printed set for "Our 20 reasons" (standard puzzle), shown in the customizer so buyers see what
 * they get. PROVISIONAL: a sample set until the client sends the wording
 * they actually print (PLAN.md, open questions). Replace them here, in one place.
 */
export const STANDARD_REASONS: readonly string[] = PROVISIONAL_STANDARD;

/** Short reasons for the puzzle, each within 5 words, drawn at random from the library. */
export async function draftReasons({ who }: Pick<DraftRequest, "who">, count: number): Promise<string[]> {
  const lib = await import("./draft-library");
  return shuffled(lib.REASONS[who]).slice(0, count);
}
