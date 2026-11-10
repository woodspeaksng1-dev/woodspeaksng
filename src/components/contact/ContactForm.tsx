"use client";

import { useEffect, useState } from "react";
import { CONTACT } from "@/lib/contact";
import { contactSchema, type ContactInput } from "@/lib/enquiry";
import { TextField, inputClass } from "../ui/FormField";
import { postEnquiry } from "./post-enquiry";

type Field = keyof ContactInput;
const EMPTY: ContactInput = { name: "", email: "", phone: "", message: "", website: "" };

/** The contact page's message form. It reaches the team by email and in admin under Enquiries. */
export function ContactForm() {
  const [form, setForm] = useState<ContactInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [attempt, setAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (attempt) document.querySelector<HTMLElement>("#contact-form [aria-invalid=true]")?.focus();
  }, [attempt]);

  const set = (key: Field, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      if (result.error.issues.some((i) => i.path[0] === "website")) return setSent(true);
      const next: Partial<Record<Field, string>> = {};
      for (const issue of result.error.issues) next[issue.path[0] as Field] ??= issue.message;
      setErrors(next);
      setAttempt((n) => n + 1);
      return;
    }
    setSending(true);
    setFailure(null);
    const r = await postEnquiry({ kind: "contact", ...result.data });
    setSending(false);
    if (r.ok) setSent(true);
    else setFailure(r.message);
  };

  if (sent)
    return (
      <div role="status" className="rounded-[1.6rem] bg-vellum p-8 shadow-card">
        <p className="font-display text-3xl text-oxblood">Thank you</p>
        <p className="mt-3 text-lg text-ink">We&rsquo;ve got your message and will reply by email within one working day.</p>
      </div>
    );

  return (
    <form id="contact-form" noValidate onSubmit={submit} className="flex flex-col gap-5 rounded-[1.6rem] bg-vellum p-6 shadow-card sm:p-8">
      <h2 className="text-3xl text-oxblood">Send us a message</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Your name" error={errors.name}>
          {(p) => <input {...p} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />}
        </TextField>
        <TextField label="Email" error={errors.email}>
          {(p) => (
            <input
              {...p}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputClass}
            />
          )}
        </TextField>
      </div>
      <TextField label="Phone (optional)" error={errors.phone}>
        {(p) => (
          <input {...p} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        )}
      </TextField>
      <TextField label="Your message" hint="An order number helps if it's about an order." error={errors.message}>
        {(p) => <textarea {...p} rows={5} value={form.message} onChange={(e) => set("message", e.target.value)} className={`${inputClass} h-auto py-3`} />}
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
          {failure}{" "}
          <a href={CONTACT.whatsappUrl(form.message)} target="_blank" rel="noopener" className="underline underline-offset-2">
            Message us on WhatsApp
          </a>
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="mt-2 h-12 rounded-full bg-oxblood px-10 text-vellum transition-colors hover:bg-wine disabled:opacity-60 sm:self-start"
      >
        {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
