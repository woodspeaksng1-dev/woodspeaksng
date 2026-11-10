import type { Metadata } from "next";
import { ComingNext } from "@/components/admin/ComingNext";

export const metadata: Metadata = { title: "Reviews" };

export default function Page() {
  return <ComingNext title="Reviews" what="Adding and approving customer reviews." />;
}
