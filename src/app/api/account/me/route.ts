import { connection } from "next/server";
import { customerFromRequest, getCustomerProfile } from "@/lib/server/customers";

/* GET: the signed-in customer's own details for filling in checkout, or { signedIn: false }. Never cached. */
export async function GET(request: Request) {
  await connection();
  const person = await customerFromRequest(request);
  if (!person) return Response.json({ signedIn: false }, { headers: { "Cache-Control": "private, no-store" } });
  const profile = await getCustomerProfile(person);
  return Response.json({ signedIn: true, ...profile }, { headers: { "Cache-Control": "private, no-store" } });
}
