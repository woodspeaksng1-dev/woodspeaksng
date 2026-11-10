import type { Metadata } from "next";
import { Suspense } from "react";
import { EnquiriesList } from "@/components/admin/EnquiriesList";
import { requireStaff } from "@/lib/server/admin-session";
import { listEnquiries } from "@/lib/server/enquiries";

export const metadata: Metadata = { title: "Enquiries" };

export default function AdminEnquiriesPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading enquiries…</p>}>
      <Enquiries />
    </Suspense>
  );
}

async function Enquiries() {
  await requireStaff();
  return <EnquiriesList enquiries={await listEnquiries()} />;
}
