import type { Metadata } from "next";
import { ComingNext } from "@/components/admin/ComingNext";

export const metadata: Metadata = { title: "Emails" };

export default function Page() {
  return <ComingNext title="Emails" what="Emails to customers who agreed to hear from Woodspeaks." />;
}
