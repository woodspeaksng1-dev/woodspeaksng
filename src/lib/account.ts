import type { OrderStatus } from "./orders";

/* What a signed-in customer sees on their account page (shared by the server and the page). */

export interface SavedAddress {
  id: string;
  label: string;
  zoneId: string;
  address: string;
  landmark: string;
}

export interface CustomerProfile {
  email: string;
  name: string | null;
  phone: string | null;
  addresses: SavedAddress[];
}

export interface CustomerOrderRow {
  number: string;
  createdAt: string;
  status: OrderStatus;
  items: string;
  total: number;
  deliveryDate: string;
  zoneName: string;
}
