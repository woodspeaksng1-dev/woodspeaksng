import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import type { VerifiedPerson } from "./auth-session";
import { CUSTOMER_COOKIE, customerFromSession } from "./customers";

/** The signed-in customer for account pages and actions (request time only), or null. */
export const currentCustomer = cache(async (): Promise<VerifiedPerson | null> => {
  await connection();
  return customerFromSession((await cookies()).get(CUSTOMER_COOKIE)?.value);
});
