"use server";

import { z } from "zod";
import { readCatalog } from "@/lib/server/catalog";
import { currentCustomer } from "@/lib/server/customer-session";
import { addAddress, addressInput, removeAddress } from "@/lib/server/customers";

/* Saved addresses. Each action checks the signed-in customer itself and only ever touches their own account. */

type Result = { ok: boolean; message: string };

export async function saveAddress(input: unknown): Promise<Result> {
  const person = await currentCustomer();
  if (!person) return { ok: false, message: "Sign in again." };
  const parsed = addressInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the address." };
  const { zones } = await readCatalog();
  return addAddress(person.email, parsed.data, new Set(zones.map((z) => z.id)));
}

export async function deleteAddress(id: unknown): Promise<Result> {
  const person = await currentCustomer();
  if (!person) return { ok: false, message: "Sign in again." };
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "That address isn't saved." };
  return removeAddress(person.email, parsed.data);
}
