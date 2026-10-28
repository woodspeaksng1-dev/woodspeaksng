import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/checkout/OrderConfirmation";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default function ConfirmationPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-28 sm:px-6">
      <OrderConfirmation />
    </div>
  );
}
