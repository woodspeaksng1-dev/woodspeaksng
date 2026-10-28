"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/admin/store";
import { TextField, inputClass } from "../ui/FormField";
import { AdminHeader, Card, adminButton, adminButtonQuiet } from "./AdminShell";
import { useCustomers } from "./CustomersList";

/** Branded broadcast: write, preview, send a test to yourself, then send to everyone opted in. */
export function EmailComposer() {
  const logEmail = useAdmin((s) => s.logEmail);
  const optedIn = useCustomers().filter((c) => c.optIn).length;
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [stage, setStage] = useState<"draft" | "tested" | "confirm" | "sent">("draft");
  const [error, setError] = useState<string | null>(null);

  const edit = (fn: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    fn(e.target.value);
    setError(null);
    if (stage !== "draft") setStage("draft");
  };
  const ready = () => {
    if (!subject.trim() || !heading.trim() || !body.trim()) {
      setError("Fill in the subject, heading and message first.");
      return false;
    }
    return true;
  };

  return (
    <div>
      <AdminHeader title="Emails" intro={`Write to the ${optedIn} customers who opted in. Send yourself a test first; every email has an unsubscribe link.`} />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 self-start">
          <TextField label="Subject line">
            {(p) => <input {...p} value={subject} onChange={edit(setSubject)} placeholder="Valentine's orders are open" className={inputClass} />}
          </TextField>
          <TextField label="Heading">
            {(p) => <input {...p} value={heading} onChange={edit(setHeading)} className={inputClass} />}
          </TextField>
          <TextField label="Message">
            {(p) => <textarea {...p} rows={8} value={body} onChange={edit(setBody)} className={`${inputClass} h-auto py-3`} />}
          </TextField>
          {error && (
            <p role="alert" className="text-sm text-oxblood">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (!ready()) return;
                logEmail(`Test email "${subject}" sent to demo staff`);
                setStage("tested");
              }}
              className={adminButtonQuiet}
            >
              Send a test to me
            </button>
            <button type="button" disabled={stage === "draft" || stage === "sent"} onClick={() => setStage("confirm")} className={adminButton}>
              Send to {optedIn} customers
            </button>
          </div>
          {stage === "draft" && <p className="text-sm text-ink-soft">Send a test first to unlock sending.</p>}
          {stage === "tested" && <p role="status" className="text-sm text-ink">Test sent (demo). Check it, then send to everyone.</p>}
          {stage === "confirm" && (
            <div role="alertdialog" aria-label="Confirm sending" className="rounded-xl border border-oxblood p-4">
              <p>
                Send &ldquo;{subject}&rdquo; to {optedIn} customers now? This can&rsquo;t be undone.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    logEmail(`Broadcast "${subject}" sent to ${optedIn} customers`);
                    setStage("sent");
                  }}
                  className={adminButton}
                >
                  Yes, send it
                </button>
                <button type="button" onClick={() => setStage("tested")} className={adminButtonQuiet}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {stage === "sent" && (
            <p role="status" className="text-sm text-ink">
              Sent to {optedIn} customers (demo, nothing was emailed).
            </p>
          )}
        </Card>

        <div aria-label="Email preview">
          <p className="mb-2 text-sm text-ink-soft">Preview</p>
          <div className="overflow-hidden rounded-2xl bg-vellum shadow-card">
            <div className="bg-oxblood px-6 py-5 text-center font-display text-2xl text-gold-light italic">Woodspeaks</div>
            <div className="px-6 py-8">
              <p className="text-xs text-ink-soft">{subject || "Subject line"}</p>
              <h2 className="mt-3 text-3xl text-oxblood">{heading || "Your heading"}</h2>
              <p className="mt-4 whitespace-pre-line text-ink">{body || "Your message appears here."}</p>
              <span className="mt-6 inline-block rounded-full bg-oxblood px-6 py-3 text-sm text-vellum">Visit the shop</span>
            </div>
            <p className="border-t border-rule px-6 py-4 text-center text-xs text-ink-soft">
              You&rsquo;re getting this because you asked for updates from Woodspeaks. <span className="underline">Unsubscribe</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
