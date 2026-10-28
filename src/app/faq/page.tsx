import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "FAQ", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="FAQ" note="Answers are being gathered from Woodspeaks." />;
}
