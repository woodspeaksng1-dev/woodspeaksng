import type { Metadata } from "next";
import { CustomersList } from "@/components/admin/CustomersList";

export const metadata: Metadata = { title: "Customers" };

export default function AdminCustomersListPage() {
  return <CustomersList />;
}
