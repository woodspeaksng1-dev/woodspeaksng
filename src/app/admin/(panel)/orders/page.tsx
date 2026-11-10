import type { Metadata } from "next";
import { OrdersList } from "@/components/admin/OrdersList";

export const metadata: Metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return <OrdersList />;
}
