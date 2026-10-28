import type { Category } from "@/lib/types";

/** The soft backdrop behind each product photo: pale at the top, toned at the foot. */
export const CATEGORY_TONE: Record<Category, { image: string; sheet: string }> = {
  scrolls: { image: "from-vellum via-parchment/60 to-sand", sheet: "bg-sand" },
  keepsakes: { image: "from-vellum via-parchment/60 to-dusk/80", sheet: "bg-dusk/70" },
  "flowers-treats": { image: "from-vellum via-parchment/60 to-blush", sheet: "bg-blush" },
  "add-on": { image: "from-vellum via-parchment/60 to-sage", sheet: "bg-sage" },
};
