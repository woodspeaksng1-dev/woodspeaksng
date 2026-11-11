export type Occasion =
  | "birthday"
  | "anniversary"
  | "corporate"
  | "wedding"
  | "just-because";

export type Recipient = "for-him" | "for-her" | "couples" | "clients";

export type Category = "scrolls" | "keepsakes" | "flowers-treats" | "add-on";

/**
 * How a product is personalized. Drives which customizer the product page shows.
 * - letter: free text written onto the item (e.g. the love scroll)
 * - reasons: a fixed number of short lines (e.g. "20 Reasons I Love You")
 * - photo: customer uploads a photo (locket, polaroid)
 * - video: customer adds a video, as a file or a link (NFC tag); staff put it on the tag
 */
export type Personalization =
  | { kind: "none" }
  | { kind: "letter"; maxWords: number }
  | { kind: "reasons"; count: number; maxWordsEach: number; fee: number }
  | { kind: "photo"; maxPhotos: number }
  | { kind: "video"; maxMb: number };

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Price in naira (whole number). The server converts to kobo at checkout. */
  price: number;
  category: Category;
  description: string;
  occasions: Occasion[];
  recipients: Recipient[];
  personalization: Personalization;
  /** Perishable items can only go to some zones (e.g. cake, bouquet). */
  perishable?: boolean;
  /** Shown in "Our Items" on the home page. Set by staff in the admin panel later. */
  featured?: boolean;
  /** Can be bought on its own and also attached to another product. */
  addOn?: boolean;
  /** Hidden by staff: off the shop and refused at checkout, kept for past orders. */
  hidden?: boolean;
  /** Set by staff in admin; shown on the product page when filled in. */
  dimensions?: string;
  included?: string;
  /** Google result title; falls back to the name. */
  seoTitle?: string;
  /** Photo description for screen readers; falls back to the name. */
  imageAlt?: string;
  /** Placeholder until the client's photography arrives. */
  image?: string;
}

export type CartCustomization =
  | { kind: "none" }
  | { kind: "letter"; text: string }
  | { kind: "reasons"; mode: "standard" | "custom"; reasons: string[] }
  | { kind: "photo"; photoNames: string[]; crop?: PhotoCrop; /** Our upload ids, one per photo, once uploaded. */ uploadIds?: string[] }
  | { kind: "video"; source: "file"; fileName: string; sizeMb: number; /** Our upload id, once uploaded. */ uploadId?: string }
  | { kind: "video"; source: "link"; url: string };

/** How the photo sits in its frame: zoom (1 = fills the frame) and offset in % of the frame. */
export interface PhotoCrop {
  zoom: number;
  x: number;
  y: number;
}

export interface CartItem {
  /** Unique per line, so the same product with different text is two lines. */
  lineId: string;
  productId: string;
  quantity: number;
  customization: CartCustomization;
  cardMessage?: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  /** null until the client sends the delivery matrix. */
  fee: number | null;
  estimate: string | null;
  /** Cake, flowers and roses can only go to these zones (fresh on the day). */
  perishables: boolean;
}

/** What the shop sells right now: products, delivery zones and making time. Read from Firestore. */
export interface Catalog {
  products: Product[];
  zones: ShippingZone[];
  /** Days to make an order before it can be delivered. */
  craftingDays: number;
}
