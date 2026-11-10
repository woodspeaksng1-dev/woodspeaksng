import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailsManager } from "@/components/admin/EmailsManager";
import { requireStaff } from "@/lib/server/admin-session";
import { audience, dailyLimit, listBroadcasts } from "@/lib/server/broadcasts";

export const metadata: Metadata = { title: "Emails" };

/** Server actions on this page may keep sending for a while after replying. */
export const maxDuration = 60;

export default function AdminEmailsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading emails…</p>}>
      <Emails />
    </Suspense>
  );
}

async function Emails() {
  const staff = await requireStaff();
  const [broadcasts, people] = await Promise.all([listBroadcasts(), audience()]);
  return <EmailsManager broadcasts={broadcasts} audienceSize={people.length} perDay={dailyLimit()} isOwner={staff.role === "owner"} />;
}
