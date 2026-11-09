import type { CheckoutDetails } from "./checkout";
import type { PricedLine } from "./order-pricing";

/*
 * An order as stored in Firestore (`orders/{number}`). Written only by the server: created as
 * "pending" when the buyer starts paying, marked "paid" once Paystack confirms the exact amount.
 * Prices and names are copied at the time of sale, so later catalog changes don't alter past orders.
 */

export type OrderStatus = "pending" | "paid" | "crafting" | "dispatched" | "delivered" | "cancelled";

export interface StoredOrder {
  /** Also the Paystack reference. Long and random, because it appears in the confirmation link. */
  number: string;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  customer: { name: string; email: string; phone: string; marketingOptIn: boolean };
  recipient: { name: string; phone: string } | null;
  delivery: {
    zoneId: string;
    zoneName: string;
    address: string;
    landmark: string;
    date: string;
    hidePrice: boolean;
  };
  lines: PricedLine[];
  itemsTotal: number;
  deliveryFee: number;
  /** In naira. */
  total: number;
  /** What Paystack must collect: total × 100, in NGN. */
  amountKobo: number;
  currency: "NGN";
  /** Present when the order includes an NFC tag. */
  nfc: { status: "to-write" | "written" } | null;
  paystack: { transactionId: number; channel: string | null; paidAt: string | null } | null;
  /** Set if Paystack reported a payment we couldn't accept (e.g. a different amount). Staff check these. */
  paymentProblem: string | null;
}

/** What the confirmation page shows: no phone numbers or street address, as the link can be shared. */
export interface OrderSummary {
  number: string;
  status: OrderStatus;
  firstName: string;
  email: string;
  deliverTo: string;
  zoneName: string;
  deliveryDate: string;
  hidePrice: boolean;
  lines: { name: string; quantity: number; total: number; customization: PricedLine["customization"] }[];
  itemsTotal: number;
  deliveryFee: number;
  total: number;
}

export function summarise(order: StoredOrder): OrderSummary {
  return {
    number: order.number,
    status: order.status,
    firstName: order.customer.name.split(" ")[0],
    email: order.customer.email,
    deliverTo: order.recipient?.name ?? order.customer.name,
    zoneName: order.delivery.zoneName,
    deliveryDate: order.delivery.date,
    hidePrice: order.delivery.hidePrice,
    lines: order.lines.map((l) => ({ name: l.name, quantity: l.quantity, total: l.lineTotal, customization: l.customization })),
    itemsTotal: order.itemsTotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
  };
}

export type { CheckoutDetails };
