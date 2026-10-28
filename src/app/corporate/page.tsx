import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Corporate gifting", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Corporate gifting" note="Our corporate gifting page is on its way." />;
}
