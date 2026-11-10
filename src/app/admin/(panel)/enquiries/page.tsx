import type { Metadata } from "next";
import { EnquiriesList } from "@/components/admin/EnquiriesList";

export const metadata: Metadata = { title: "Enquiries" };

export default function AdminEnquiriesListPage() {
  return <EnquiriesList />;
}
