import type { Metadata } from "next";
import { ComingNext } from "@/components/admin/ComingNext";

export const metadata: Metadata = { title: "Reminders" };

export default function Page() {
  return <ComingNext title="Reminders" what="The dates customers ask us to remember, and when each reminder email goes out." />;
}
