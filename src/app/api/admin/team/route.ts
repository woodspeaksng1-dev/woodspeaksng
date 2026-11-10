import { z } from "zod";
import { addStaff, removeStaff, requireStaffRequest, staffEmail } from "@/lib/server/staff";

/* Owner only: add (POST { email }) or remove (DELETE { email }) a member of staff. */

const body = z.object({ email: staffEmail });

export async function POST(request: Request) {
  const check = await requireStaffRequest(request, "owner");
  if (!check.ok) return check.response;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  const result = await addStaff(check.staff, parsed.data.email, "staff");
  return Response.json({ message: result.message }, { status: result.ok ? 200 : 409 });
}

export async function DELETE(request: Request) {
  const check = await requireStaffRequest(request, "owner");
  if (!check.ok) return check.response;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  if (parsed.data.email === check.staff.email) return Response.json({ message: "You can't remove yourself." }, { status: 400 });
  const result = await removeStaff(check.staff, parsed.data.email);
  return Response.json({ message: result.message }, { status: result.ok ? 200 : 404 });
}
