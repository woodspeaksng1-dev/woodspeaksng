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
 */
export type Personalization =
  | { kind: "none" }
  | { kind: "letter"; maxWords: number }
  | { kind: "reasons"; count: number; maxWordsEach: number; fee: number }
  | { kind: "photo"; maxPhotos: number };

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
  /** Placeholder until the client's photography arrives. */
  image?: string;
}

export type CartCustomization =
  | { kind: "none" }
  | { kind: "letter"; text: string }
  | { kind: "reasons"; mode: "standard" | "custom"; reasons: string[] }
  | { kind: "photo"; photoNames: string[] };

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
}
