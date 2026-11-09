import { z } from "zod";
import type { Catalog } from "./types";

/**
 * Checkout details. Shared by the checkout form (live feedback) and the server route that creates
 * the order and prices it. Prices never come from this form. Built from the live catalog's delivery
 * zones and making time (`checkoutSchema(catalog)`).
 */

/** Nigerian mobile numbers: 080…, 0701…, +234 80…, with or without spaces and dashes. */
const NG_PHONE = /^(?:\+?234|0)[789][01]\d{8}$/;
const cleanPhone = (v: string) => v.replace(/[\s()-]/g, "");

const phone = z
  .string()
  .trim()
  .min(1, "Enter a phone number.")
  .transform(cleanPhone)
  .refine((v) => NG_PHONE.test(v), "Enter a Nigerian mobile number, e.g. 0803 123 4567.");

const name = (label: string) =>
  z.string().trim().min(2, `Enter ${label}.`).max(80, "That's a little long. Keep it under 80 characters.");

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The earliest date we can deliver an order placed today. */
export function earliestDelivery(craftingDays: number, today = new Date()) {
  const d = new Date(today);
  d.setDate(d.getDate() + craftingDays);
  return isoDate(d);
}

export const checkoutSchema = ({ zones, craftingDays }: Pick<Catalog, "zones" | "craftingDays">) => {
  const zoneIds = new Set(zones.map((zone) => zone.id));
  return (
    z
      .object({
        name: name("your name"),
        email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
        phone,
        marketingOptIn: z.boolean(),
        forSomeoneElse: z.boolean(),
        recipientName: z.string().trim().max(80),
        recipientPhone: z.string().trim(),
        zoneId: z.string().refine((id) => zoneIds.has(id), "Choose a delivery area."),
        address: z.string().trim().min(8, "Enter the full delivery address.").max(240),
        landmark: z.string().trim().max(120),
        deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a delivery date."),
        hidePrice: z.boolean(),
      })
      // Runs alongside the field checks (`when`), so every problem shows in one go instead of in rounds.
      // In that mode it can see unvalidated input (the server reuses this schema), so it only reads strings.
      .superRefine(
        (v, ctx) => {
          const str = (x: unknown) => (typeof x === "string" ? x.trim() : "");
          if (v.forSomeoneElse === true) {
            if (str(v.recipientName).length < 2)
              ctx.addIssue({ code: "custom", path: ["recipientName"], message: "Enter their name." });
            if (!NG_PHONE.test(cleanPhone(str(v.recipientPhone))))
              ctx.addIssue({
                code: "custom",
                path: ["recipientPhone"],
                message: "Enter their Nigerian mobile number.",
              });
          }
          const date = str(v.deliveryDate);
          if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < earliestDelivery(craftingDays))
            ctx.addIssue({
              code: "custom",
              path: ["deliveryDate"],
              message: `Each gift takes ${craftingDays} days to make. Choose a later date.`,
            });
        },
        { when: ({ value }) => typeof value === "object" && value !== null },
      )
  );
};

export type CheckoutInput = z.input<ReturnType<typeof checkoutSchema>>;
export type CheckoutDetails = z.output<ReturnType<typeof checkoutSchema>>;
