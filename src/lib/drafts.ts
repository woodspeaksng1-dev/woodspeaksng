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

// Each letter is five parts: an opening for the occasion, two paragraphs in the chosen tone, a
// paragraph about who it's for, a wish for what comes next, and a closing line. Together they come to about 250 to 290 words,
// just under the scroll's 300-word limit.

const OPENINGS: Record<Occasion, string[]> = {
  birthday: [
    "Happy birthday. I wanted to give you something more lasting than a message that disappears by tomorrow, so I am writing this down on paper, where it can stay with you for as long as you choose to keep it.",
    "Another year of you, and the world is better for it. Birthdays are a good excuse to say the things we usually leave unsaid, so today I am taking that excuse and using every word of it.",
    "Today is your day, and I wanted you to have something you can keep. Cakes get eaten and flowers fade, but words written down have a way of staying, so here are mine.",
  ],
  anniversary: [
    "Happy anniversary. When I look back at where we started, I could never have guessed how much of my life would be shaped by you, or how grateful I would be for every bit of it.",
    "Another year together, and I would choose it all again. The good days, the hard days and every ordinary day in between have been better because you were in them.",
    "Today I am counting the years, and every one of them has you in it. I wanted to mark this one with something more than a card, something you can hold and read again.",
  ],
  wedding: [
    "On your wedding day, I wanted to put a few words somewhere they will last. Today is full of music, dancing and people who love you, and I hope you find a quiet moment to read this.",
    "Congratulations. Today two stories become one. I have watched yours unfold, and I could not be happier to see where it has brought you, standing beside the person you chose.",
    "As you begin this new chapter, here is something to carry with you. The years ahead will bring all kinds of seasons, and I hope these words remind you how loved you are in every one.",
  ],
  corporate: [
    "Thank you for everything you have brought to the work we share. Days get busy and moments like this pass quickly, so I wanted to stop and say it properly, in writing.",
    "Some people make the hard days lighter. You are one of them. I wanted to mark this moment with more than a quick message, because what you bring deserves to be said clearly.",
    "I wanted to mark this moment with more than an email. Emails get archived and forgotten, but a letter can sit on a desk or a shelf and remind you what your work has meant. So here, in plain words, is my thank you.",
  ],
  "just-because": [
    "There is no occasion today. I just wanted you to know. Too often we wait for birthdays and big moments to say what matters, and I did not want to wait any longer.",
    "I do not say this often enough, so I am writing it down. Words spoken in passing are easy to forget, but these are on paper, and you can read them whenever you need to.",
    "Nothing special happened today, except that I thought of you. And when I thought of you, I realised how much I would like you to know what you mean to me. So I sat down, picked up a pen and decided to tell you properly.",
  ],
};

const BODIES: Record<DraftTone, string[]> = {
  heartfelt: [
    "You have a way of making the people around you feel seen. I have watched you give your time, your patience and your kindness without ever asking for anything back, and I want you to know that none of it has gone unnoticed.\n\nI think about the times you checked on me before I even said anything was wrong, the calls that came at exactly the right moment, and the way you always seem to know what to say. Those things may feel small to you, but they have carried me through more than you know. Having you in my life has taught me what it means to truly care for someone.",
    "When I think about the moments that have shaped me, so many of them have you in them. The quiet support, the honest words when I needed them, the laughter when I needed it more.\n\nLife has not always been easy, and there were days I did not feel strong enough for what was in front of me. On those days you were there, sometimes with advice, sometimes with a meal, and sometimes just sitting with me in silence. You never made me feel like a burden. You made me feel like I mattered, and I carry that with me.",
    "Some people pass through our lives and some people stay. You stayed, through the easy seasons and the hard ones, and I am grateful for every day of it.\n\nWe have shared celebrations and disappointments, long conversations and comfortable silences, and through all of it you have been the same: steady, honest and kind. I do not take that for granted. I know how rare it is to find someone who sees you clearly and cares for you anyway. Whenever I doubt myself, I remember that you believe in me, and that is often enough to keep me going.",
  ],
  romantic: [
    "Every day with you feels like coming home. I love the way you laugh, the way you listen, and the way you make ordinary days feel like something worth remembering.\n\nI love our mornings, the small talk over breakfast, the messages in the middle of a busy day that make me smile at my phone. I love how you hold my hand without thinking about it, and how you can calm me down with just a look. With you, I never have to pretend. I can be tired, silly, worried or excited, and you take every version of me as I am.",
    "If I wrote down every reason I love you, I would run out of parchment long before I ran out of reasons. You are my favourite person, my safe place and my best decision.\n\nI love your kindness, your strength and the way your eyes light up when you talk about the things you care about. I love that you make me laugh even on days I do not want to. I love that you dream big and work hard, and that you let me be part of those dreams. When I picture my future, every good thing in it includes you.",
    "I still remember the moment I knew. Since then, you have only given me more reasons to be sure. Loving you is the easiest thing I have ever done.\n\nWe have grown so much together. We have learned each other's moods, favourite meals and silly habits, and somehow I love you more for every one of them. You have seen me at my best and at my worst, and you have never let go of my hand. Whatever comes next, I want to face it beside you, laughing at the small things and holding on through the big ones.",
  ],
  playful: [
    "I would say you are getting better with age, but honestly you were already doing quite well. Thank you for the jokes, the late-night talks and for putting up with me.\n\nLet us be honest, I am not always easy. I lose things, I forget things, and I have opinions about everything. Somehow you are still here, which tells me you are either very patient or very confused. I choose to believe it is patience. You make ordinary days funnier, long days shorter and bad days a lot more bearable, and I would happily give the speech when you win the award for it.",
    "Scientists have not yet explained how one person can be this wonderful and this stubborn at the same time. I have decided not to wait for their findings.\n\nYou argue with the radio, you insist your way of doing things is the right way, and the annoying part is that you are usually right. You laugh at your own jokes before you finish telling them, and somehow that makes them funnier. You are the first person I want to tell when something ridiculous happens. Never change, except maybe that one habit. You know the one.",
    "I looked for a gift as special as you are. This was the closest I could find, so please be impressed.\n\nI did think about writing you a poem, but we both know how that would have ended. So instead I am writing down, in plain words, the things I usually only say with a joke. You are wonderful. You make me laugh harder than anyone, you know exactly when I need cheering up, and you always save me the last piece, most of the time. Life with you is never boring, and I would not have it any other way.",
  ],
  grateful: [
    "Thank you. For showing up, for believing in me, and for all the small things you do that you probably think nobody sees. I see them, and I am thankful for every one.\n\nI see the early mornings and the late nights, the plans you make so others can rest, and the way you put people first without being asked. I see the advice you give freely and the encouragement that came just when I was ready to give up. So much of what I have been able to do started with you making room for it. I may not always say it out loud, so I am saying it here, where it can last.",
    "I am grateful for your generosity, your wisdom and your steady presence. You have made a difference that will last far longer than you know.\n\nThe lessons you taught me show up in my life every day, in how I treat people, how I handle hard things and how I keep going when it would be easier to stop. You gave without counting the cost and never waited for a thank you. That kind of goodness is rare, and I do not want it to pass without being named. Whatever good I manage to do carries a little of you in it.",
    "Some debts can never be repaid, only acknowledged. Consider this my acknowledgement, written down so it lasts.\n\nYou opened doors for me that I could not have opened alone. You trusted me before I had earned it, and you gave me chances that changed my direction. When I stumbled, you did not give up on me, and when I did well, you were the first to celebrate. I cannot give back everything you have given me, but I can promise to pass it on, and to remember where it came from every time I do. You changed my story, and I will never forget it.",
  ],
};

const ABOUT_YOU: Record<DraftWho, string[]> = {
  partner: [
    "You are my partner in every sense: my best friend, my biggest supporter and the person I want to share every small win with. Building a life with you has been my greatest adventure, and there is nobody I would rather grow old beside, arguing about where to eat and laughing until our faces hurt.",
    "I keep thinking about all the little things that make us who we are: the inside jokes, the songs we sing badly in traffic, the plans we make for the future. You are part of every corner of my life now, and I would not want it any other way. Thank you for choosing me, again and again.",
    "When people ask me what love looks like, I think of you. It looks like patience on hard days, a cup of tea I did not ask for, and someone who stays up to hear about my day. You have shown me what it means to be truly loved, and I hope you feel it from me too.",
  ],
  parent: [
    "Everything I know about kindness, hard work and faith, I learned first from watching you. You gave up so much so that I could have more, and I understand that better with every year that passes. Whatever I become, I hope you look at me and see the love and effort you poured in.",
    "I remember the school runs, the advice I did not want to hear and the prayers you said for me when I was not listening. You were teaching me all along. Now that I am older, I see how much strength it took, and how much love sat behind every sacrifice you made.",
    "You have been my first home, my first teacher and my loudest supporter. No matter how old I get, I still want to call you when something good happens, and when something goes wrong. Thank you for raising me with so much love, and for loving me still, even on my difficult days.",
  ],
  friend: [
    "Friends like you are rare. You have been there for the celebrations and the heartbreaks, the long talks and the even longer silences. You know my stories, my secrets and my bad habits, and you are still here. I will always be in your corner, the same way you have been in mine.",
    "I do not know how I got lucky enough to have you as a friend, but I am not asking questions. You make me braver, you tell me the truth even when I do not want it, and you never let me forget who I am. Life is better, and a lot louder, with you in it.",
    "Some of my happiest memories have you in them, laughing at something nobody else would find funny. Through every change in our lives, our friendship has stayed steady. You are the kind of friend people wish for, and I am grateful every day that I get to call you mine.",
  ],
  colleague: [
    "Working with you has made a real difference, to the work and to the people around you. You bring care, skill and good humour to everything you do, and you make it easy for others to do their best. I have learned a great deal from you, and I hope we keep building good things together.",
    "Your commitment, your ideas and your willingness to help have not gone unnoticed. You make the team stronger and the hard weeks easier, and people trust you because you always follow through. This is a small way of saying that what you do matters, and that it is truly appreciated.",
    "The best partnerships are built on trust, and you have earned it many times over. You have shown up when it counted, solved problems before they grew, and treated everyone with respect along the way. Thank you for being someone I am proud to work with and glad to know.",
  ],
};

// A wish for what comes next, matched to the occasion. Comes just before the closing line.
const WISHES: Record<Occasion, string[]> = {
  birthday: [
    "As you start this new year of your life, I hope it brings you rest when you are tired, courage when things feel uncertain, and plenty of reasons to laugh. I hope the people around you treat you with the same care you show them. Most of all, I hope you take a moment today to be proud of how far you have come.",
    "My wish for you this year is simple: more of the things that make you happy and less of the things that wear you down. More good food, good music and good company. More dreams coming true, and the patience to enjoy the journey while they do. You deserve every good thing this year can hold.",
    "I hope this year gives back to you everything you so easily give to others. I hope you are celebrated, not just today but on the ordinary days too. And whenever the year gets busy or heavy, I hope you remember this letter and know that you are deeply appreciated, exactly as you are.",
  ],
  anniversary: [
    "I cannot wait to see what the coming years hold for us: the places we will go, the things we will build and the quiet evenings in between. Whatever changes, I hope we keep choosing each other, keep laughing at the same silly things and keep finding new reasons to be grateful for what we have.",
    "Here is to the next chapter, and the one after that. I hope we keep learning each other, keep forgiving quickly and keep making time for the small moments that matter most. I hope we never stop dreaming together, and that we look back one day and smile at everything this year was the start of.",
    "As we step into another year, I want you to know that I am not just looking back with gratitude, I am looking forward with excitement. There is so much I still want to share with you, so many memories we have not made yet. I am ready for all of it, as long as it is with you.",
  ],
  wedding: [
    "My wish for your marriage is that it is full of patience, laughter and friendship. I hope you always speak kindly to each other, even when you disagree, and that you never stop being curious about one another. May your home be a place of peace, and may your love grow deeper with every year you share.",
    "I hope your marriage gives you a partner in every sense: someone to dream with, pray with and laugh with. When the days are hard, I hope you hold on tighter. When the days are easy, I hope you notice and give thanks. And I hope you never forget the joy of this day, the people who gathered for you and the promise you made in front of them.",
    "As you build your life together, I pray you find strength in each other and joy in the everyday things: shared meals, long talks and quiet evenings at home. May you be each other's safe place, best friend and biggest supporter, today and for all the years still to come.",
  ],
  corporate: [
    "As we look ahead, I am excited about what we will do next. I hope the coming year brings you new opportunities, well-deserved success and the recognition you have earned. Please know that your contribution has been noticed and valued, and that I look forward to many more years of working together.",
    "I hope this small token reminds you of the difference you make. The work we do is better because of the care you bring to it, and the people around you are better for knowing you. Here is to continued growth, shared success and the next chapter of what we are building together.",
    "Thank you for your trust, your partnership and the standard you set for everyone around you. I hope the year ahead is good to you, both at work and beyond it. Whatever comes next, I look forward to facing it alongside someone I respect as much as you.",
  ],
  "just-because": [
    "I hope you keep this somewhere you can find it on the days you need it. On the busy days, the tired days and the days when you wonder if anyone notices, read it again and remember that someone does. You matter more than you know, and I wanted to make sure you heard it.",
    "There will be days when you forget how much you mean to the people around you. On those days, I hope you find this letter and read it slowly. Let it remind you that you are loved, that you are valued, and that someone thinks about you even when there is no special reason to.",
    "I hope this brings a smile to an ordinary day. Life moves so quickly that we forget to stop and say what matters, so consider this me stopping. Thank you for being in my life. I hope you never doubt how glad I am that you are. Keep this close, read it whenever you like, and know that every word of it is true.",
  ],
};

const CLOSINGS: Record<DraftWho, string[]> = {
  partner: ["I love you, today and always.", "Forever yours.", "Here is to every year still ahead of us."],
  parent: ["With all my love and thanks.", "Everything good in me started with you.", "I love you more than these words can hold."],
  friend: ["Lucky to call you my friend.", "Here is to many more years of us.", "With love, always."],
  colleague: ["With warm regards and thanks.", "Here is to everything we will build next.", "With gratitude and respect."],
};

/** Three letter options for the scroll, each just under its 300-word limit. */
export function draftLetters({ who, occasion, tone }: DraftRequest): string[] {
  countDraft();
  return [0, 1, 2].map((i) =>
    [OPENINGS[occasion][i], BODIES[tone][i], ABOUT_YOU[who][i], WISHES[occasion][i], CLOSINGS[who][i]].join("\n\n"),
  );
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
