"use client";

import { useEffect, useState } from "react";
import { CONTACT } from "@/lib/contact";
import { BUDGETS, enquirySchema, type Enquiry, type EnquiryInput } from "@/lib/enquiry";
import { postEnquiry } from "../contact/post-enquiry";
import { TextField, inputClass } from "../ui/FormField";

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
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<{ message: string; whatsapp: string } | null>(null);

  useEffect(() => {
    if (attempt) document.querySelector<HTMLElement>("#enquiry [aria-invalid=true]")?.focus();
  }, [attempt]);

  const set = (key: Field, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (ev: React.FormEvent) => {
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
    setSending(true);
    setFailure(null);
    const r = await postEnquiry({ kind: "corporate", ...result.data });
    setSending(false);
    // If it can't be sent, WhatsApp with the details filled in is the way through.
    if (r.ok) setSent(true);
    else setFailure({ message: r.message, whatsapp: CONTACT.whatsappUrl(whatsappText(result.data)) });
  };

  if (sent)
    return (
      <div role="status" className="rounded-[1.6rem] bg-vellum p-8 shadow-card">
        <p className="font-display text-3xl text-oxblood">Thank you</p>
        <p className="mt-3 text-lg text-ink">
          We&rsquo;ve got your enquiry and will reply by email within one working day.
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
      {failure && (
        <p role="alert" className="text-oxblood">
          {failure.message}{" "}
          <a href={failure.whatsapp} target="_blank" rel="noopener" className="underline underline-offset-2">
            Send it on WhatsApp instead
          </a>
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="mt-2 h-12 rounded-full bg-oxblood px-10 text-vellum transition-colors hover:bg-wine disabled:opacity-60 sm:self-start"
      >
        {sending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
