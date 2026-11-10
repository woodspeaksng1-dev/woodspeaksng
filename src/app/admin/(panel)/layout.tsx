import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/server/admin-session";

/** Every staff page: signed-in team members only; anyone else is sent to /admin/login. */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="py-32 text-center text-ink-soft">Checking you&rsquo;re signed in…</p>}>
      <StaffGate>{children}</StaffGate>
    </Suspense>
  );
}

async function StaffGate({ children }: { children: ReactNode }) {
  const staff = await requireStaff();
  return <AdminShell staff={{ email: staff.email, name: staff.name, role: staff.role }}>{children}</AdminShell>;
}
