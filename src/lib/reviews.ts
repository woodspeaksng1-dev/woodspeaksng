import { z } from "zod";

/*
 * Customer reviews for "What they say about us" and the product pages. Real words only, copied as written
 * (light spelling fixes are fine), with the customer's OK to show them. Staff manage them in admin; they
 * live in Firestore `reviews/{id}`. Stars only when the customer gave them; never filled in for them.
 */

export const REVIEW_SOURCES = {
  "old-site": "The old website",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "Email",
  "in-person": "In person",
  other: "Somewhere else",
} as const;
export type ReviewSource = keyof typeof REVIEW_SOURCES;

export interface Review {
  id: string;
  quote: string;
  /** First name and initial, e.g. "Chioma A." */
  who: string;
  productId: string | null;
  /** Shown under the name when there's no product, e.g. "Corporate client". */
  role: string | null;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  /** The order it's from, if staff matched one. A matched paid order shows "Verified order". */
  orderNumber: string | null;
  verified: boolean;
  source: ReviewSource;
  visible: boolean;
  sortOrder: number;
}

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** What staff type in the admin form. */
export const reviewInput = z.object({
  quote: z.string().trim().min(10, "Paste the customer's words.").max(600, "Keep it under 600 characters; trim it if the customer agrees."),
  who: z.string().trim().min(2, "Add the name to show, e.g. Daniel O.").max(60, "Keep the name short, e.g. Daniel O."),
  productId: z.preprocess(blankToNull, z.string().regex(/^[a-z0-9-]{1,64}$/).nullable()),
  role: z.preprocess(blankToNull, z.string().trim().max(40, "Keep it under 40 characters.").nullable()),
  rating: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
  ),
  orderNumber: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim().toUpperCase()) : v),
    z.string().regex(/^WS-[A-Z0-9]{6,12}$/, "Order numbers look like WS-ABC1234567.").nullable(),
  ),
  source: z.enum(Object.keys(REVIEW_SOURCES) as [ReviewSource, ...ReviewSource[]], "Choose where it came from."),
  visible: z.boolean(),
  consent: z.literal(true, "Only add reviews the customer has agreed to show. Tick the box to confirm."),
});
export type ReviewInput = z.input<typeof reviewInput>;

/**
 * The six reviews from the client's old site (woodspeaks.ng, 28 Oct 2026), word for word, no stars (that
 * site showed none). Seeded into Firestore by scripts/seed-catalog.mjs; also what the shop shows if
 * Firestore can't be read. Some mention engraving and gold inlay: confirm with the client (PLAN.md, question 9).
 */
export const SEED_REVIEWS: Review[] = [
  {
    quote:
      "I gifted the 20 Reasons Puzzle for Valentine's Day. Watching him read every single custom piece brought tears to his eyes. The wood smells incredible and the engraving is flawless.",
    who: "Daniel O.",
    productId: "love-puzzle",
  },
  {
    quote:
      "The craftsmanship is unparalleled. I ordered a custom engraved piece for our anniversary, and the attention to detail left us absolutely speechless. Truly a gift that speaks.",
    who: "Korede O.",
  },
  {
    quote:
      "The locket is breathtaking. The vintage brass finish gives it such beautiful character, and the way they secured the photo inside shows they truly care about preserving memories.",
    who: "Jackson D.",
    productId: "locket",
  },
  {
    quote:
      "We ordered 50 personalized corporate gift boxes. The quality of the wood and the precision of the engraving elevated our brand in the eyes of our clients. Outstanding service.",
    who: "Adeola A.",
    role: "Corporate client",
  },
  {
    quote:
      "The unboxing experience alone is worth every penny. From the wax-sealed scrolls to the dark hieroglyphic lining, it felt like opening a piece of ancient history. Absolutely magical.",
    who: "Blessing A.",
  },
  {
    quote:
      "Pictures don't do it justice. The way the gold inlay catches the light against the dark wood grain is stunning. It's not just a gift; it's an heirloom.",
    who: "Chinaza A.",
  },
].map((r, i) => ({
  id: `old-site-${i + 1}`,
  productId: null,
  role: null,
  rating: null,
  orderNumber: null,
  verified: false,
  source: "old-site" as const,
  visible: true,
  sortOrder: i,
  ...r,
}));
