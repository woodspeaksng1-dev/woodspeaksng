"use client";

import { useEffect, useState } from "react";
import { CONTACT } from "@/lib/contact";
import { BUDGETS, enquirySchema, type Enquiry, type EnquiryInput } from "@/lib/enquiry";
import { TextField, inputClass } from "../ui/FormField";

/**
 * Until the email route exists (backend stage), a valid enquiry opens WhatsApp with the
 * details filled in, so it still reaches the team today. Set to true when /api/enquiry is live.
 */
const EMAIL_LIVE = false;

type Field = keyof EnquiryInput;

const EMPTY: EnquiryInput = {
  company: "",
  name: "",
  email: "",
  phone: "",
  quantity: "",
  budget: "" as EnquiryInput["budget"],
  dateNeeded: "",
  message: "",
  website: "",
};

function whatsappText(e: Enquiry) {
  return [
    "Hello Woodspeaks, a corporate gifting enquiry:",
    `Company: ${e.company}`,
    `Name: ${e.name} (${e.email}${e.phone ? `, ${e.phone}` : ""})`,
    `Quantity: ${e.quantity}`,
    `Budget: ${BUDGETS[e.budget]}`,
    `Needed by: ${e.dateNeeded}`,
    e.message && `Details: ${e.message}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function EnquiryForm() {
  const [form, setForm] = useState<EnquiryInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [attempt, setAttempt] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (attempt) document.querySelector<HTMLElement>("#enquiry [aria-invalid=true]")?.focus();
  }, [attempt]);

  const set = (key: Field, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const result = enquirySchema.safeParse(form);
    if (!result.success) {
      // A filled honeypot means a bot: act as if it was sent and do nothing.
      if (result.error.issues.some((i) => i.path[0] === "website")) return setSent(true);
      const next: Partial<Record<Field, string>> = {};
      for (const issue of result.error.issues) next[issue.path[0] as Field] ??= issue.message;
      setErrors(next);
      setAttempt((n) => n + 1);
      return;
    }
    if (!EMAIL_LIVE) window.open(CONTACT.whatsappUrl(whatsappText(result.data)), "_blank", "noopener");
    setSent(true);
  };

  if (sent)
    return (
      <div role="status" className="rounded-[1.6rem] bg-vellum p-8 shadow-card">
        <p className="font-display text-3xl text-oxblood">Thank you</p>
        <p className="mt-3 text-lg text-ink">
          {EMAIL_LIVE
            ? "We've got your enquiry and will reply by email within one working day."
            : "WhatsApp has opened with your enquiry filled in. Press send there and we'll reply as soon as we can."}
        </p>
      </div>
    );

  const text = (key: Field, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <TextField label={label} hint={hint} error={errors[key]}>
      {(p) => <input {...p} {...extra} value={form[key] as string} onChange={(e) => set(key, e.target.value)} className={inputClass} />}
    </TextField>
  );

  return (
    <form id="enquiry" noValidate onSubmit={submit} className="flex flex-col gap-5 rounded-[1.6rem] bg-vellum p-6 shadow-card sm:p-8">
      <h2 className="text-3xl text-oxblood">Tell us what you need</h2>
      {text("company", "Company or organisation", { autoComplete: "organization" })}
      <div className="grid gap-5 sm:grid-cols-2">
        {text("name", "Your name", { autoComplete: "name" })}
        {text("email", "Work email", { type: "email", inputMode: "email", autoComplete: "email" })}
      </div>
      {text("phone", "Phone (optional)", { type: "tel", inputMode: "tel", autoComplete: "tel" })}
      <div className="grid gap-5 sm:grid-cols-2">
        {text("quantity", "How many gifts?", { inputMode: "numeric", placeholder: "e.g. 50" })}
        {text("dateNeeded", "Needed by", { type: "date" })}
      </div>
      <TextField label="Budget" error={errors.budget}>
        {(p) => (
          <select {...p} value={form.budget} onChange={(e) => set("budget", e.target.value)} className={inputClass}>
            <option value="" disabled>
              Choose a budget per gift
            </option>
            {Object.entries(BUDGETS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        )}
      </TextField>
      <TextField label="Anything else? (optional)" hint="The occasion, who it's for, ideas you have." error={errors.message}>
        {(p) => (
          <textarea
            {...p}
            rows={4}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            className={`${inputClass} h-auto py-3`}
          />
        )}
      </TextField>
      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </label>
      </div>
      <button type="submit" className="mt-2 h-12 rounded-full bg-oxblood px-10 text-vellum transition-colors hover:bg-wine sm:self-start">
        {EMAIL_LIVE ? "Send enquiry" : "Send on WhatsApp"}
      </button>
    </form>
  );
}
