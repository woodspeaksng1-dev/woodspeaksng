import type { Metadata } from "next";
import { ComingNext } from "@/components/admin/ComingNext";

export const metadata: Metadata = { title: "Homepage" };

export default function Page() {
  return <ComingNext title="Homepage" what="Choose which products show on the home page from each product's page (Show on the home page). Ordering customer moments and logos comes next." />;
}
