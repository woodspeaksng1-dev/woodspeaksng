import { z } from "zod";
import type { Catalog, LeadDays, ShippingZone } from "./types";

/**
 * Checkout details. Shared by the checkout form (live feedback) and the server route that creates
 * the order and prices it. Prices never come from this form. Built from the live catalog's delivery
 * zones and delivery lead times (`checkoutSchema(catalog)`).
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

/*
 * Delivery dates. Lagos areas can have it from the day after ordering, areas outside Lagos from 3 days after
 * (both set in admin: LeadDays), and nobody gets a delivery on a Sunday (no dispatch that day). Dates are
 * Lagos calendar dates as YYYY-MM-DD, worked out in Lagos time whatever the device's or server's clock zone.
 */

/** Today's date in Lagos. */
export function lagosToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const addDays = (iso: string, days: number) => {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export const isSunday = (iso: string) => utc(iso).getUTCDay() === 0;

/** How many days after ordering an area's earliest delivery is. */
export const leadDaysFor = (zone: Pick<ShippingZone, "outsideLagos"> | null | undefined, lead: LeadDays) =>
  zone?.outsideLagos ? lead.outside : lead.lagos;

/** The earliest date an order placed now can be delivered: `days` later, moved to Monday if that's a Sunday. */
export function earliestDelivery(days: number, now = new Date()) {
  const d = addDays(lagosToday(now), days);
  return isSunday(d) ? addDays(d, 1) : d;
}

/** The furthest ahead a delivery can be booked. */
export const LATEST_DELIVERY_DAYS = 180;

/** Why a date can't be chosen for this area, or null if it can. */
export function deliveryDateProblem(date: string, zone: Pick<ShippingZone, "outsideLagos"> | null | undefined, lead: LeadDays, now = new Date()) {
  if (isSunday(date)) return "We don't deliver on Sundays. Choose another day.";
  const earliest = earliestDelivery(leadDaysFor(zone, lead), now);
  if (date < earliest)
    return zone?.outsideLagos
      ? `Outside Lagos, the earliest we can deliver is ${shortDate(earliest)}.`
      : `The earliest we can deliver is ${shortDate(earliest)}.`;
  if (date > addDays(lagosToday(now), LATEST_DELIVERY_DAYS)) return "Choose a date within the next six months.";
  return null;
}

/** "Tue 17 Nov" for a YYYY-MM-DD date. */
export const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(utc(iso));

export const checkoutSchema = ({ zones, leadDays }: Pick<Catalog, "zones" | "leadDays">) => {
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
          const zone = zones.find((z) => z.id === v.zoneId);
          const problem = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(utc(date).getTime()) ? deliveryDateProblem(date, zone, leadDays) : null;
          if (problem) ctx.addIssue({ code: "custom", path: ["deliveryDate"], message: problem });
        },
        { when: ({ value }) => typeof value === "object" && value !== null },
      )
  );
};

export type CheckoutInput = z.input<ReturnType<typeof checkoutSchema>>;
export type CheckoutDetails = z.output<ReturnType<typeof checkoutSchema>>;
