import type { Metadata } from "next";
import { ComingNext } from "@/components/admin/ComingNext";

export const metadata: Metadata = { title: "Enquiries" };

export default function Page() {
  return <ComingNext title="Enquiries" what="Messages from the contact and corporate forms." />;
}
