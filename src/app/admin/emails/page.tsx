import type { Metadata } from "next";
import { EmailComposer } from "@/components/admin/EmailComposer";

export const metadata: Metadata = { title: "Emails" };

export default function AdminEmailComposerPage() {
  return <EmailComposer />;
}
