import type { Occasion } from "./types";

/*
 * Mock drafts for "Help me write it" until the Gemini route exists (backend stage).
 * The real route takes the same inputs and returns 3 messages within the product's limit.
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
  /** Optional detail from the customer, up to 150 characters. Sent to the AI route, not used by the mock. */
  note?: string;
}

/** Drafts allowed per visit; the wizard shows a friendly note after that. */
export const DRAFT_LIMIT = 6;
const USED_KEY = "ws-drafts-used";

export function draftsUsed() {
  try {
    return Number(sessionStorage.getItem(USED_KEY)) || 0;
  } catch {
    return 0;
  }
}

function countDraft() {
  try {
    sessionStorage.setItem(USED_KEY, String(draftsUsed() + 1));
  } catch {}
}

const OPENINGS: Record<Occasion, string[]> = {
  birthday: [
    "Happy birthday.",
    "Another year of you, and the world is better for it.",
    "Today is your day, and I wanted you to have something you can keep.",
  ],
  anniversary: [
    "Happy anniversary.",
    "Another year together, and I would choose it all again.",
    "Today I am counting the years, and every one of them has you in it.",
  ],
  wedding: [
    "On your wedding day, I wanted to put a few words somewhere they will last.",
    "Congratulations. Today two stories become one.",
    "As you begin this new chapter, here is something to carry with you.",
  ],
  corporate: [
    "Thank you for everything you have brought to the work we share.",
    "Some people make the hard days lighter. You are one of them.",
    "I wanted to mark this moment with more than an email.",
  ],
  "just-because": [
    "There is no occasion today. I just wanted you to know.",
    "I do not say this often enough, so I am writing it down.",
    "Nothing special happened today, except that I thought of you.",
  ],
};

const BODIES: Record<DraftTone, string[]> = {
  heartfelt: [
    "You have a way of making the people around you feel seen. I have watched you give your time, your patience and your kindness without ever asking for anything back, and I want you to know that none of it has gone unnoticed.",
    "When I think about the moments that have shaped me, so many of them have you in them. The quiet support, the honest words when I needed them, the laughter when I needed it more.",
    "Some people pass through our lives and some people stay. You stayed, through the easy seasons and the hard ones, and I am grateful for every day of it.",
  ],
  romantic: [
    "Every day with you feels like coming home. I love the way you laugh, the way you listen, and the way you make ordinary days feel like something worth remembering.",
    "If I wrote down every reason I love you, I would run out of parchment long before I ran out of reasons. You are my favourite person, my safe place and my best decision.",
    "I still remember the moment I knew. Since then, you have only given me more reasons to be sure. Loving you is the easiest thing I have ever done.",
  ],
  playful: [
    "I would say you are getting better with age, but honestly you were already doing quite well. Thank you for the jokes, the late-night talks and for putting up with me.",
    "Scientists have not yet explained how one person can be this wonderful and this stubborn at the same time. I have decided not to wait for their findings.",
    "I looked for a gift as special as you are. This was the closest I could find, so please be impressed.",
  ],
  grateful: [
    "Thank you. For showing up, for believing in me, and for all the small things you do that you probably think nobody sees. I see them, and I am thankful for every one.",
    "I am grateful for your generosity, your wisdom and your steady presence. You have made a difference that will last far longer than you know.",
    "Some debts can never be repaid, only acknowledged. Consider this my acknowledgement, written down so it lasts.",
  ],
};

const CLOSINGS: Record<DraftWho, string[]> = {
  partner: ["I love you, today and always.", "Forever yours.", "Here is to every year still ahead of us."],
  parent: ["With all my love and thanks.", "Everything good in me started with you.", "I love you more than these words can hold."],
  friend: ["Lucky to call you my friend.", "Here is to many more years of us.", "With love, always."],
  colleague: ["With warm regards and thanks.", "Here is to everything we will build next.", "With gratitude and respect."],
};

/** Three letter options for the scroll. */
export function draftLetters({ who, occasion, tone }: DraftRequest): string[] {
  countDraft();
  return [0, 1, 2].map((i) => [OPENINGS[occasion][i], BODIES[tone][i], CLOSINGS[who][i]].join("\n\n"));
}

const PARTNER_REASONS = [
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

const GENERAL_REASONS = [
  "You always show up",
  "Your advice is always right",
  "You make hard days lighter",
  "Your laugh is contagious",
  "You believe in me",
  "You never judge, only listen",
  "Your quiet, everyday kindness",
  "You remember every little thing",
  "You make people feel welcome",
  "Your strength inspires me daily",
  "You are endlessly generous",
  "Your honesty keeps me grounded",
  "Our long talks",
  "You celebrate every small win",
  "You are fiercely loyal",
  "Your calm in every storm",
  "You taught me so much",
  "You make life more fun",
  "You are always there",
  "You are simply irreplaceable",
];

/** Twenty short reasons for the puzzle, each within 5 words. */
export function draftReasons({ who }: Pick<DraftRequest, "who">, count: number): string[] {
  countDraft();
  const pool = who === "partner" ? PARTNER_REASONS : GENERAL_REASONS;
  return pool.slice(0, count);
}
