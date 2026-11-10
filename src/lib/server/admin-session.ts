import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE, staffFromSession, type SignedInStaff } from "./staff";

/*
 * The signed-in member of staff for admin pages (Server Components). Reads the session cookie, so call it
 * inside a <Suspense> boundary. Checked once per request (React cache), and again by every admin route
 * handler and action that reads or changes data: the page check alone is never the only lock.
 */
export const currentStaff = cache(async (): Promise<SignedInStaff | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  return staffFromSession(cookie);
});

/** Staff only (or the owner only): anyone else goes to the sign-in page. */
export async function requireStaff(role?: "owner"): Promise<SignedInStaff> {
  const staff = await currentStaff();
  if (!staff) redirect("/admin/login");
  if (role === "owner" && staff.role !== "owner") redirect("/admin");
  return staff;
}
