import { z } from "zod";
import { isoDate } from "./checkout";

/** Corporate gifting enquiry. Shared by the form and, later, the server route that emails the team. */

export const BUDGETS = {
  "under-20k": "Under ₦20,000 per gift",
  "20k-50k": "₦20,000 to ₦50,000 per gift",
  "50k-100k": "₦50,000 to ₦100,000 per gift",
  "over-100k": "Over ₦100,000 per gift",
} as const;

export const enquirySchema = z.object({
  company: z.string().trim().min(2, "Enter your company or organisation.").max(120),
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  phone: z.string().trim().max(20),
  quantity: z
    .string()
    .trim()
    .min(1, "Enter how many gifts you need.")
    .pipe(
      z.coerce
        .number<string>("Enter a number, e.g. 50.")
        .int("Enter a whole number.")
        .min(1, "Enter how many gifts you need.")
        .max(10000, "For orders over 10,000, message us directly."),
    ),
  budget: z.enum(Object.keys(BUDGETS) as [keyof typeof BUDGETS], "Choose a budget."),
  dateNeeded: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date you need them by.")
    .refine((d) => d > isoDate(new Date()), "Choose a date in the future."),
  message: z.string().trim().max(1000, "Keep it under 1,000 characters."),
  /** Honeypot: hidden from people, filled in by bots. Any value means the enquiry is dropped. */
  website: z.string().max(0),
});

export type EnquiryInput = z.input<typeof enquirySchema>;
export type Enquiry = z.output<typeof enquirySchema>;
