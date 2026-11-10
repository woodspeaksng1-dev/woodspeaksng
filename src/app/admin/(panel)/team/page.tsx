import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, Card } from "@/components/admin/AdminShell";
import { TeamManager } from "@/components/admin/TeamManager";
import { requireStaff } from "@/lib/server/admin-session";
import { listStaff } from "@/lib/server/staff";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <div>
      <AdminHeader title="Team" intro="Who can sign in to this admin. Only you, the owner, can add or remove people." />
      <Suspense fallback={<p className="mt-6 text-ink-soft">Loading the team…</p>}>
        <Team />
      </Suspense>
    </div>
  );
}

async function Team() {
  const owner = await requireStaff("owner");
  const team = await listStaff();
  return (
    <Card className="mt-6">
      <TeamManager
        me={owner.email}
        team={team.map((m) => ({ email: m.email, name: m.name, role: m.role, addedAt: m.addedAt }))}
      />
    </Card>
  );
}
