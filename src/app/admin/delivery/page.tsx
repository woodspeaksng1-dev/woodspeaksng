import type { Metadata } from "next";
import { DeliverySettings } from "@/components/admin/DeliverySettings";

export const metadata: Metadata = { title: "Delivery" };

export default function AdminDeliverySettingsPage() {
  return <DeliverySettings />;
}
