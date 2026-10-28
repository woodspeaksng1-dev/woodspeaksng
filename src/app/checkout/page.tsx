import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Checkout" note="Checkout is built in the backend stage, with Paystack." />;
}
