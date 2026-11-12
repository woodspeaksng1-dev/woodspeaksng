import { z } from "zod";
import { imageSrc } from "./media";

/**
 * Customer moments: photos customers have shared, shown on the home page stack (the first four), the
 * About page (the first three) and /about/gallery (all). Staff add, edit, hide and order them in admin
 * (Firestore `moments`, see lib/server/moments.ts). Each one needs the customer's OK before it goes live
 * (NDPA); admin asks for it on every new moment.
 *
 * Captions describe the photo. The client prefers no names (9 Nov), so `who` is optional.
 */
export interface Moment {
  id: string;
  caption: string;
  /** First name and area, e.g. "Tolu, Lekki". Only with the customer's OK. */
  who: string | null;
  /** The product in the photo, linked under the card. */
  productSlug: string | null;
  /** The photo's address: /catalog-photo/… (uploaded in admin) or /media/gallery/… (the first four). */
  image: string | null;
  visible: boolean;
  sortOrder: number;
}

/** The four the site started with (files in public/media/gallery). Loaded into Firestore the first time admin opens Moments. */
export const BUILT_IN_MOMENTS: Moment[] = [
  { id: "m02", caption: "The moment she unrolled it", productSlug: "love-scroll" },
  { id: "m04", caption: "Read aloud over lunch", productSlug: "love-scroll" },
  { id: "m01", caption: "Every word, in ink", productSlug: "love-scroll" },
  { id: "m03", caption: "Sealed, tied and ready to give", productSlug: "love-scroll" },
].map((m, i) => ({ ...m, who: null, image: imageSrc(`gallery/${m.id}`), visible: true, sortOrder: i }));

/** How many moments each place shows. */
export const HOME_MOMENTS = 4;
export const ABOUT_MOMENTS = 3;

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** The words staff type for a moment (new or edited). Checked in the browser for feedback and again on the server. */
export const momentInput = z.object({
  caption: z.string().trim().min(3, "Add a short caption, e.g. The moment she unrolled it.").max(80, "Keep the caption under 80 characters."),
  who: z.preprocess(blankToNull, z.string().trim().max(60, "Keep it short, e.g. Tolu, Lekki.").nullable()),
  productSlug: z.preprocess(blankToNull, z.string().regex(/^[a-z0-9-]{1,64}$/).nullable()),
});
export type MomentInput = z.input<typeof momentInput>;
