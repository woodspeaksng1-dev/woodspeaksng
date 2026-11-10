import type { Metadata } from "next";
import { OrderDetail } from "@/components/admin/OrderDetail";
import { SAMPLE_ORDERS } from "@/lib/admin/sample-data";

// DEMO: one page per sample order. With Firestore this renders on request for staff only.
export function generateStaticParams() {
  return SAMPLE_ORDERS.map((o) => ({ number: o.number }));
}

export async function generateMetadata({ params }: PageProps<"/admin/orders/[number]">): Promise<Metadata> {
  const { number } = await params;
  return { title: number };
}

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  const { number } = await params;
  return <OrderDetail number={number} />;
}
