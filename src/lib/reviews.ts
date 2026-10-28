/**
 * Customer reviews for "What they say about us". Use real words only, copied as
 * written (light spelling fixes are fine), with the customer's OK to show them.
 * Sources: order follow-up emails (backend stage), Instagram and WhatsApp messages.
 *
 * PLACEHOLDERS below mark the layout; they are not customer quotes and must be
 * replaced before launch.
 */
export interface Review {
  id: string;
  quote: string;
  /** First name and area, e.g. "Chioma, Ikeja". */
  who: string;
  productSlug?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Matched to a paid order once reviews come from the order system. */
  verified?: boolean;
  placeholder?: boolean;
}

const slot = (id: string, productSlug: string, long = false): Review => ({
  id,
  quote: long
    ? "A customer's review goes here, in their own words. Longer ones get the large card, so pick the one that tells the whole story: who it was for, how it arrived, what they said when they read it."
    : "A customer's review goes here, in their own words.",
  who: "Customer name, area",
  productSlug,
  rating: 5,
  placeholder: true,
});

export const REVIEWS: Review[] = [
  slot("r1", "love-scroll", true),
  slot("r2", "20-reasons-i-love-you-puzzle"),
  slot("r3", "locket"),
  slot("r4", "pocket-watch"),
  slot("r5", "love-scroll"),
];
