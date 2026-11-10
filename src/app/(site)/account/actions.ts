"use server";

import { z } from "zod";
import { readCatalog } from "@/lib/server/catalog";
import { currentCustomer } from "@/lib/server/customer-session";
import { addAddress, addressInput, removeAddress } from "@/lib/server/customers";
import { stopForCustomer } from "@/lib/server/reminders";

/* Saved addresses and reminders. Each action checks the signed-in customer itself and only ever touches their own account. */

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

export async function stopReminder(orderNumber: unknown): Promise<Result> {
  const person = await currentCustomer();
  if (!person) return { ok: false, message: "Sign in again." };
  const parsed = z.string().regex(/^WS-[A-Z0-9]{6,12}$/).safeParse(orderNumber);
  if (!parsed.success || !(await stopForCustomer(parsed.data, person.email))) return { ok: false, message: "That reminder isn't yours." };
  return { ok: true, message: "Reminder stopped." };
}
