import type { Metadata } from "next";
import { HomepageEditor } from "@/components/admin/HomepageEditor";

export const metadata: Metadata = { title: "Homepage" };

export default function AdminHomepagePage() {
  return <HomepageEditor />;
}
