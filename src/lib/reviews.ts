/**
 * Customer reviews for "What they say about us". Use real words only, copied as
 * written (light spelling fixes are fine), with the customer's OK to show them.
 * Sources: order follow-up emails (backend stage), Instagram and WhatsApp messages.
 *
 * The six below are copied word for word from the client's current site (woodspeaks.ng,
 * 28 Oct 2026). That site shows no star ratings, so none are given here. Some mention
 * engraving and gold inlay: confirm with the client before launch (PLAN.md, question 9).
 */
export interface Review {
  id: string;
  quote: string;
  /** First name and area, e.g. "Chioma, Ikeja". */
  who: string;
  productSlug?: string;
  /** Shown under the name when there's no product, e.g. "Corporate client". */
  role?: string;
  /** Only when the customer gave one; never filled in for them. */
  rating?: 1 | 2 | 3 | 4 | 5;
  /** Matched to a paid order once reviews come from the order system. */
  verified?: boolean;
  placeholder?: boolean;
}

export const REVIEWS: Review[] = [
  {
    id: "r1",
    quote:
      "I gifted the 20 Reasons Puzzle for Valentine's Day. Watching him read every single custom piece brought tears to his eyes. The wood smells incredible and the engraving is flawless.",
    who: "Daniel O.",
    productSlug: "20-reasons-i-love-you-puzzle",
  },
  {
    id: "r2",
    quote:
      "The craftsmanship is unparalleled. I ordered a custom engraved piece for our anniversary, and the attention to detail left us absolutely speechless. Truly a gift that speaks.",
    who: "Korede O.",
  },
  {
    id: "r3",
    quote:
      "The locket is breathtaking. The vintage brass finish gives it such beautiful character, and the way they secured the photo inside shows they truly care about preserving memories.",
    who: "Jackson D.",
    productSlug: "locket",
  },
  {
    id: "r4",
    quote:
      "We ordered 50 personalized corporate gift boxes. The quality of the wood and the precision of the engraving elevated our brand in the eyes of our clients. Outstanding service.",
    who: "Adeola A.",
    role: "Corporate client",
  },
  {
    id: "r5",
    quote:
      "The unboxing experience alone is worth every penny. From the wax-sealed scrolls to the dark hieroglyphic lining, it felt like opening a piece of ancient history. Absolutely magical.",
    who: "Blessing A.",
  },
  {
    id: "r6",
    quote:
      "Pictures don't do it justice. The way the gold inlay catches the light against the dark wood grain is stunning. It's not just a gift; it's an heirloom.",
    who: "Chinaza A.",
  },
];
