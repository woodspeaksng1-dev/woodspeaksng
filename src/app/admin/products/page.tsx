import type { Metadata } from "next";
import { ProductsList } from "@/components/admin/ProductsList";

export const metadata: Metadata = { title: "Products" };

export default function AdminProductsPage() {
  return <ProductsList />;
}
