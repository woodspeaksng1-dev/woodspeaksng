/**
 * Customer moments: photos and short clips customers have shared, used on the
 * home page stack, the hero and /about/gallery. Each one needs the customer's
 * OK before it goes live (NDPA). Media lives at public/media/gallery/<id>.*
 * (an image, and optionally a video of the same name that plays on hover).
 *
 * Captions describe the photo only. The customers have given permission; the
 * client prefers no names (9 Nov), so `who` stays empty.
 */
export interface Moment {
  id: string;
  /** First name and area, e.g. "Tolu, Lekki". Only with the customer's OK. */
  who?: string;
  caption: string;
  /** The product in the photo, linked under the card. */
  productSlug?: string;
  /** Shape in the gallery grid. */
  shape: "tall" | "square" | "portrait";
}

export const MOMENTS: Moment[] = [
  { id: "m02", caption: "The moment she unrolled it", productSlug: "love-scroll", shape: "portrait" },
  { id: "m04", caption: "Read aloud over lunch", productSlug: "love-scroll", shape: "portrait" },
  { id: "m01", caption: "Every word, in ink", productSlug: "love-scroll", shape: "portrait" },
  { id: "m03", caption: "Sealed, tied and ready to give", productSlug: "love-scroll", shape: "portrait" },
];
