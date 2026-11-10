import type { Catalog, Product, ShippingZone } from "./types";

/**
 * The STARTING catalog, from the client's asset list (22 Oct 2026). The live catalog is in Firestore
 * (staff edit it in admin): the site reads it with `getStorefront()` on the server and `useCatalog()` in
 * the browser. This file only seeds Firestore (`scripts/seed-catalog.mjs`), is the fallback if Firestore
 * can't be read (display only). Never price an order from it.
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
    personalization: { kind: "reasons", count: 20, maxWordsEach: 6, fee: 15000 },
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
    description: "Add a video message. They tap their phone on the tag and your video plays.",
    occasions: ["anniversary", "birthday", "wedding", "just-because"],
    recipients: ["for-her", "for-him", "couples"],
    personalization: { kind: "video", maxMb: 100 },
    addOn: true,
  },
];

/**
 * Delivery areas and fees from the client (9 Nov 2026): 38 Lagos locations, flat fee each, in naira.
 * Names tidied for display; A to Z so buyers find theirs. Every area is assumed to take cake, flowers
 * and roses (TO CONFIRM with the client). Staff change fees in admin; this seeds Firestore.
 */
export const SHIPPING_ZONES: ShippingZone[] = [
  { id: "abule-egba", name: "Abule Egba", fee: 7000, estimate: null, perishables: true },
  { id: "agbado", name: "Agbado", fee: 8000, estimate: null, perishables: true },
  { id: "ago-palace", name: "Ago Palace", fee: 3000, estimate: null, perishables: true },
  { id: "agric-ikorodu", name: "Agric, Ikorodu", fee: 8000, estimate: null, perishables: true },
  { id: "ajah-addo-road", name: "Ajah, Addo Road", fee: 10000, estimate: null, perishables: true },
  { id: "ajao-estate", name: "Ajao Estate", fee: 4500, estimate: null, perishables: true },
  { id: "ajasa-command", name: "Ajasa Command", fee: 7000, estimate: null, perishables: true },
  { id: "alapere-ketu", name: "Alapere, Ketu", fee: 5000, estimate: null, perishables: true },
  { id: "egbeda", name: "Egbeda", fee: 6000, estimate: null, perishables: true },
  { id: "ejigbo", name: "Ejigbo", fee: 5000, estimate: null, perishables: true },
  { id: "gbagada", name: "Gbagada", fee: 5000, estimate: null, perishables: true },
  { id: "igbogbo-ikorodu", name: "Igbogbo, Ikorodu", fee: 8000, estimate: null, perishables: true },
  { id: "ikeja", name: "Ikeja", fee: 5000, estimate: null, perishables: true },
  { id: "ikorodu-garage", name: "Ikorodu Garage", fee: 8000, estimate: null, perishables: true },
  { id: "ikosi-ketu", name: "Ikosi, Ketu", fee: 5000, estimate: null, perishables: true },
  { id: "ikotun", name: "Ikotun", fee: 6000, estimate: null, perishables: true },
  { id: "isawo-road-ikorodu", name: "Isawo Road, Ikorodu", fee: 8000, estimate: null, perishables: true },
  { id: "isolo", name: "Isolo", fee: 5000, estimate: null, perishables: true },
  { id: "itamaga-ikorodu", name: "Itamaga, Ikorodu", fee: 9000, estimate: null, perishables: true },
  { id: "iyana-ipaja", name: "Iyana Ipaja", fee: 7000, estimate: null, perishables: true },
  { id: "iyana-oworonshoki", name: "Iyana Oworonshoki", fee: 5000, estimate: null, perishables: true },
  { id: "lekki-phase-1", name: "Lekki Phase 1", fee: 6000, estimate: null, perishables: true },
  { id: "magodo-ketu", name: "Magodo, Ketu", fee: 5000, estimate: null, perishables: true },
  { id: "maryland", name: "Maryland", fee: 5000, estimate: null, perishables: true },
  { id: "meiran", name: "Meiran", fee: 7000, estimate: null, perishables: true },
  { id: "mile-12", name: "Mile 12", fee: 6000, estimate: null, perishables: true },
  { id: "mile-2", name: "Mile 2", fee: 2500, estimate: null, perishables: true },
  { id: "ogba", name: "Ogba", fee: 6000, estimate: null, perishables: true },
  { id: "ogudu-ojota", name: "Ogudu, Ojota", fee: 5000, estimate: null, perishables: true },
  { id: "ojo", name: "Ojo", fee: 5000, estimate: null, perishables: true },
  { id: "ojodu-berger", name: "Ojodu Berger", fee: 6000, estimate: null, perishables: true },
  { id: "opic-estate", name: "OPIC Estate", fee: 7000, estimate: null, perishables: true },
  { id: "orchid", name: "Orchid", fee: 8000, estimate: null, perishables: true },
  { id: "osapa-london", name: "Osapa London", fee: 7000, estimate: null, perishables: true },
  { id: "oshodi", name: "Oshodi", fee: 3500, estimate: null, perishables: true },
  { id: "sangotedo", name: "Sangotedo", fee: 10000, estimate: null, perishables: true },
  { id: "victoria-island", name: "Victoria Island", fee: 5000, estimate: null, perishables: true },
  { id: "yaba", name: "Yaba", fee: 5000, estimate: null, perishables: true },
];


/** Days to make an order before it can be delivered. TO CONFIRM with the client (2–3 days). */
export const CRAFTING_DAYS = 3;

/** Starting catalog, as one object. */
export const SEED_CATALOG: Catalog = { products: PRODUCTS, zones: SHIPPING_ZONES, craftingDays: CRAFTING_DAYS };

// Lookups on a catalog (the live one from Firestore, or the seed).
export const findProduct = (c: Catalog, id: string) => c.products.find((p) => p.id === id);
export const findProductBySlug = (c: Catalog, slug: string) => c.products.find((p) => p.slug === slug);
export const findZone = (c: Catalog, id: string) => c.zones.find((z) => z.id === id);
export const featured = (c: Catalog) => c.products.filter((p) => p.featured).slice(0, 6);

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
