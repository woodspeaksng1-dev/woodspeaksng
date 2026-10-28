import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Your account" note="Order tracking and reminders arrive with the backend stage." />;
}
