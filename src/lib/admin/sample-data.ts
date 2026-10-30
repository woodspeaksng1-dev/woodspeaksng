import type { CartCustomization } from "../types";

/*
 * SAMPLE data for the admin panel demo (31 Oct). Not real customers or orders.
 * In the backend stage every screen reads Firestore through server routes instead.
 */

export type OrderStatus = "paid" | "crafting" | "dispatched" | "delivered";
export type NfcStatus = "awaiting" | "uploaded" | "approved" | "written";

export interface AdminOrder {
  number: string;
  placedAt: string;
  customer: { name: string; email: string; phone: string; optIn: boolean };
  recipient?: { name: string; phone: string };
  zoneId: string;
  address: string;
  landmark?: string;
  deliveryDate: string;
  hidePrice: boolean;
  lines: { productId: string; quantity: number; customization: CartCustomization }[];
  status: OrderStatus;
  /** Present when the order includes an NFC memory tag. */
  nfc?: { status: NfcStatus; fileName?: string; note?: string };
}

export interface AdminReview {
  id: string;
  quote: string;
  who: string;
  productSlug?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  approved: boolean;
}

export interface AdminReminder {
  id: string;
  email: string;
  occasion: string;
  date: string;
}

export interface AdminEnquiry {
  id: string;
  kind: "corporate" | "contact";
  receivedAt: string;
  from: string;
  email: string;
  company?: string;
  summary: string;
  message: string;
}

export const SAMPLE_ORDERS: AdminOrder[] = [
  {
    number: "WS-K7P2QD",
    placedAt: "2026-10-28T09:12:00",
    customer: { name: "Sample Customer A", email: "customer.a@example.com", phone: "0803 000 0001", optIn: true },
    recipient: { name: "Sample Recipient", phone: "0803 000 0002" },
    zoneId: "lagos-island",
    address: "1 Sample Close, Lekki Phase 1",
    landmark: "Near the roundabout",
    deliveryDate: "2026-11-02",
    hidePrice: true,
    lines: [
      {
        productId: "scroll",
        quantity: 1,
        customization: {
          kind: "letter",
          text: "Another year together, and I would choose it all again.\n\nIf I wrote down every reason I love you, I would run out of parchment long before I ran out of reasons.\n\nForever yours.",
        },
      },
      { productId: "nfc-tag", quantity: 1, customization: { kind: "none" } },
    ],
    status: "paid",
    nfc: { status: "uploaded", fileName: "our-song.m4a", note: "Play this when you open it." },
  },
  {
    number: "WS-3HN8XA",
    placedAt: "2026-10-27T16:40:00",
    customer: { name: "Sample Customer B", email: "customer.b@example.com", phone: "0803 000 0003", optIn: false },
    zoneId: "lagos-mainland",
    address: "2 Sample Street, Yaba",
    deliveryDate: "2026-10-31",
    hidePrice: false,
    lines: [
      {
        productId: "love-puzzle",
        quantity: 1,
        customization: {
          kind: "reasons",
          mode: "custom",
          reasons: Array.from({ length: 20 }, (_, i) => `Sample reason number ${i + 1}`),
        },
      },
    ],
    status: "crafting",
  },
  {
    number: "WS-9TQM4R",
    placedAt: "2026-10-26T11:05:00",
    customer: { name: "Sample Customer C", email: "customer.c@example.com", phone: "0803 000 0004", optIn: true },
    zoneId: "interstate-major",
    address: "3 Sample Avenue, Wuse 2, Abuja",
    deliveryDate: "2026-10-30",
    hidePrice: false,
    lines: [
      { productId: "locket", quantity: 1, customization: { kind: "photo", photoNames: ["family.jpg"], crop: { zoom: 1.2, x: 0, y: -4 } } },
      { productId: "journal", quantity: 1, customization: { kind: "none" } },
    ],
    status: "dispatched",
  },
  {
    number: "WS-2BWX7K",
    placedAt: "2026-10-20T08:30:00",
    customer: { name: "Sample Customer D", email: "customer.d@example.com", phone: "0803 000 0005", optIn: true },
    recipient: { name: "Sample Recipient D", phone: "0803 000 0006" },
    zoneId: "lagos-mainland",
    address: "4 Sample Road, Ikeja GRA",
    deliveryDate: "2026-10-24",
    hidePrice: true,
    lines: [
      { productId: "cake", quantity: 1, customization: { kind: "none" } },
      { productId: "rose", quantity: 2, customization: { kind: "none" } },
    ],
    status: "delivered",
  },
  {
    number: "WS-6FJP8N",
    placedAt: "2026-10-28T07:55:00",
    customer: { name: "Sample Customer E", email: "customer.e@example.com", phone: "0803 000 0007", optIn: false },
    zoneId: "lagos-island",
    address: "5 Sample Crescent, Victoria Island",
    deliveryDate: "2026-11-03",
    hidePrice: false,
    lines: [
      { productId: "scroll", quantity: 1, customization: { kind: "letter", text: "Happy birthday. Today is your day, and I wanted you to have something you can keep." } },
      { productId: "nfc-tag", quantity: 1, customization: { kind: "none" } },
    ],
    status: "paid",
    nfc: { status: "awaiting" },
  },
];

export const SAMPLE_REMINDERS: AdminReminder[] = [
  { id: "rem1", email: "customer.d@example.com", occasion: "Anniversary", date: "2026-11-14" },
  { id: "rem2", email: "customer.a@example.com", occasion: "Birthday", date: "2026-12-05" },
  { id: "rem3", email: "customer.c@example.com", occasion: "Mother's birthday", date: "2027-01-19" },
];

export const SAMPLE_ENQUIRIES: AdminEnquiry[] = [
  {
    id: "enq1",
    kind: "corporate",
    receivedAt: "2026-10-27T14:20:00",
    from: "Sample Contact",
    email: "gifts@sample-company.example",
    company: "Sample Company Ltd",
    summary: "40 gifts · ₦20,000 to ₦50,000 each · by 10 Dec",
    message: "End of year gifts for our top clients. Could each scroll carry a short personal note?",
  },
  {
    id: "enq2",
    kind: "contact",
    receivedAt: "2026-10-28T08:02:00",
    from: "Sample Visitor",
    email: "visitor@example.com",
    summary: "Question about delivery to Ibadan",
    message: "Do you deliver the love scroll to Ibadan, and how long does it take?",
  },
];
