import type { Product, ShippingZone } from "./types";

/**
 * Mock catalog for the frontend build, taken from the client's asset list (22 Oct 2026).
 * Prices are final per the asset list. Dimensions, included items, photos and
 * occasion/recipient tags are still to be confirmed by the client.
 * In the backend phase this moves to Firestore and prices are read on the server.
 */
export const PRODUCTS: Product[] = [
  {
    id: "scroll",
    slug: "love-scroll",
    name: "Handcrafted Love Scroll",
    price: 15590,
    category: "scrolls",
    description:
      "Your letter, handwritten on aged parchment, tied with twine and sealed with a personalised wax stamp.",
    occasions: ["anniversary", "birthday", "wedding", "just-because"],
    recipients: ["for-her", "for-him", "couples"],
    personalization: { kind: "letter", maxWords: 300 },
    featured: true,
  },
  {
    id: "love-puzzle",
    slug: "20-reasons-i-love-you-puzzle",
    name: "20 Reasons I Love You Puzzle",
    price: 20000,
    category: "keepsakes",
    description:
      "Piece by piece, they uncover the reasons their heart belongs with you. Choose our reasons, or write all twenty yourself.",
    occasions: ["anniversary", "birthday", "just-because"],
    recipients: ["for-her", "for-him", "couples"],
    personalization: { kind: "reasons", count: 20, maxWordsEach: 5, fee: 15000 },
    featured: true,
  },
  {
    id: "locket",
    slug: "locket",
    name: "Locket",
    price: 19200,
    category: "keepsakes",
    description: "A hidden memory resting close to the heart, with your photo set inside.",
    occasions: ["anniversary", "birthday", "just-because"],
    recipients: ["for-her", "couples"],
    personalization: { kind: "photo", maxPhotos: 1 },
    featured: true,
  },
  {
    id: "pocket-watch",
    slug: "pocket-watch",
    name: "Pocket Watch",
    price: 15000,
    category: "keepsakes",
    description: "Because some moments deserve to be measured forever.",
    occasions: ["anniversary", "birthday", "corporate"],
    recipients: ["for-him", "clients"],
    personalization: { kind: "none" },
    featured: true,
  },
  {
    id: "journal",
    slug: "journal",
    name: "Journal",
    price: 15000,
    category: "keepsakes",
    description: "A bound journal for the thoughts worth keeping.",
    occasions: ["birthday", "corporate", "just-because"],
    recipients: ["for-her", "for-him", "clients"],
    personalization: { kind: "none" },
    featured: true,
  },
  {
    id: "bouquet",
    slug: "bouquet-of-flowers",
    name: "Bouquet of Flowers",
    price: 85000,
    category: "flowers-treats",
    description: "A full bouquet, arranged on the day of delivery.",
    occasions: ["anniversary", "birthday", "wedding"],
    recipients: ["for-her", "couples"],
    personalization: { kind: "none" },
    perishable: true,
    featured: true,
  },
  {
    id: "magnifying-glass",
    slug: "magnifying-glass",
    name: "Magnifying Glass",
    price: 9500,
    category: "keepsakes",
    description: "A vintage-style magnifying glass for the curious mind.",
    occasions: ["birthday", "corporate", "just-because"],
    recipients: ["for-him", "clients"],
    personalization: { kind: "none" },
  },
  {
    id: "polaroid",
    slug: "polaroid",
    name: "Polaroid",
    price: 5500,
    category: "keepsakes",
    description: "Capturing a moment in an instant, held close to the heart.",
    occasions: ["birthday", "anniversary", "just-because"],
    recipients: ["for-her", "for-him", "couples"],
    personalization: { kind: "photo", maxPhotos: 1 },
  },
  {
    id: "cake",
    slug: "cake",
    name: "Cake",
    price: 45000,
    category: "flowers-treats",
    description: "Baked fresh for the day it arrives.",
    occasions: ["birthday", "anniversary", "wedding"],
    recipients: ["for-her", "for-him", "couples"],
    personalization: { kind: "none" },
    perishable: true,
  },
  {
    id: "rose",
    slug: "real-rose",
    name: "Real Rose",
    price: 10000,
    category: "flowers-treats",
    description: "A single real rose. Add it to any gift.",
    occasions: ["anniversary", "just-because"],
    recipients: ["for-her", "couples"],
    personalization: { kind: "none" },
    perishable: true,
    addOn: true,
  },
  {
    id: "nfc-tag",
    slug: "nfc-memory-tag",
    name: "NFC Memory Tag",
    price: 7000,
    category: "add-on",
    description:
      "Add a video, voice note or photos. They tap their phone on the tag and your message plays.",
    occasions: ["anniversary", "birthday", "wedding", "just-because"],
    recipients: ["for-her", "for-him", "couples"],
    personalization: { kind: "none" },
    addOn: true,
  },
];

/** Delivery fees and estimates are pending from the client. */
export const SHIPPING_ZONES: ShippingZone[] = [
  { id: "lagos-island", name: "Lagos Island, Lekki, Ajah", fee: null, estimate: null },
  { id: "lagos-mainland", name: "Lagos Mainland", fee: null, estimate: null },
  { id: "lagos-outskirts", name: "Lagos outskirts (Ikorodu, Epe, Badagry)", fee: null, estimate: null },
  { id: "interstate-major", name: "Abuja, Port Harcourt, Ibadan", fee: null, estimate: null },
  { id: "nationwide", name: "Other states", fee: null, estimate: null },
];

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);
export const getProductBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const featuredProducts = () => PRODUCTS.filter((p) => p.featured).slice(0, 6);

export const OCCASION_LABELS = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  corporate: "Corporate",
  wedding: "Wedding",
  "just-because": "Just because",
} as const;

export const RECIPIENT_LABELS = {
  "for-him": "For him",
  "for-her": "For her",
  couples: "Couples",
  clients: "Clients",
} as const;
