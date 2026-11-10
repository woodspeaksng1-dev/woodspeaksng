"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteEmailDraft, previewEmail, saveEmailDraft, sendTestEmail, sendToEveryone } from "@/app/admin/(panel)/emails/actions";
import { shortDateTime } from "@/lib/admin/format";
import type { BroadcastContent, BroadcastRow } from "@/lib/broadcast";
import { inputClass } from "../ui/FormField";
import { AdminHeader, Badge, Card, adminButton, adminButtonQuiet } from "./AdminShell";

type Result = { ok: boolean; message: string };
const BLANK: BroadcastContent = { subject: "", heading: "", body: "", buttonLabel: "", buttonUrl: "" };
const contentOf = (b: BroadcastContent): BroadcastContent => ({
  subject: b.subject,
  heading: b.heading,
  body: b.body,
  buttonLabel: b.buttonLabel,
  buttonUrl: b.buttonUrl,
});
const same = (a: BroadcastContent, b: BroadcastContent) => JSON.stringify(contentOf(a)) === JSON.stringify(contentOf(b));

function StatusBadge({ b }: { b: BroadcastRow }) {
  if (b.status === "sent") return <Badge tone="quiet">Sent</Badge>;
  if (b.status === "sending") return <Badge tone="wine">Sending</Badge>;
  return b.tested ? <Badge tone="gold">Tested</Badge> : <Badge>Draft</Badge>;
}

function Preview({ html }: { html: string | null }) {
  if (!html) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-ink">Preview</p>
      {/* Sandboxed with nothing allowed: it only shows the email, it can't run or navigate. */}
      <iframe title="Email preview" sandbox="" srcDoc={html} className="mt-2 h-[32rem] w-full rounded-xl border border-rule bg-vellum" />
    </div>
  );
}

/** What was sent and how far it got. Sent emails can't change. */
function SentView({ b }: { b: BroadcastRow }) {
  const [html, setHtml] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const done = b.sent + b.failed + b.skipped;
  return (
    <div>
      <h2 className="text-2xl text-oxblood">{b.subject}</h2>
      <p className="mt-2 text-sm text-ink-soft">
        {b.queuedAt && `Sent ${shortDateTime(b.queuedAt)}. `}
        {b.status === "sending"
          ? `${done} of ${b.total} done so far; the rest go out each morning.`
          : `Finished${b.finishedAt ? ` ${shortDateTime(b.finishedAt)}` : ""}.`}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["To", b.total],
          ["Sent", b.sent],
          ["Unsubscribed first", b.skipped],
          ["Failed", b.failed],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-paper-shade/40 p-3">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="font-display text-2xl tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {!html && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await previewEmail(contentOf(b));
              if (r.ok) setHtml(r.html);
            })
          }
          className={`${adminButtonQuiet} mt-4`}
        >
          Show the email
        </button>
      )}
      <Preview html={html} />
    </div>
  );
}

function Editor({
  draft,
  audienceSize,
  perDay,
  isOwner,
  onSaved,
  onDeleted,
}: {
  draft: BroadcastRow | null;
  audienceSize: number;
  perDay: number;
  isOwner: boolean;
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<BroadcastContent>(draft ? contentOf(draft) : BLANK);
  const [html, setHtml] = useState<string | null>(null);
  const [msg, setMsg] = useState<Result | null>(null);
  const [busy, start] = useTransition();
  const set = (key: keyof BroadcastContent, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const unsaved = !draft || !same(form, draft);
  const canSend = isOwner && !!draft && draft.tested && !unsaved && audienceSize > 0;

  /** Saves if anything changed; returns the draft's id, or null if it didn't save. */
  const save = async (): Promise<string | null> => {
    if (!unsaved && draft) return draft.id;
    const r = await saveEmailDraft(draft?.id ?? null, form);
    setMsg(r);
    if (!r.ok || !r.id) return null;
    onSaved(r.id);
    return r.id;
  };

  const showPreview = async () => {
    const r = await previewEmail(form);
    if (r.ok) setHtml(r.html);
    else setMsg(r);
  };

  const field = "text-sm font-semibold text-ink";
  return (
    <form noValidate onSubmit={(e) => e.preventDefault()} className="grid gap-4">
      <label className={field}>
        Subject
        <input value={form.subject} onChange={(e) => set("subject", e.target.value)} className={`${inputClass} font-normal`} placeholder="e.g. Valentine's orders close on the 7th" />
      </label>
      <label className={field}>
        Heading in the email (optional)
        <input value={form.heading} onChange={(e) => set("heading", e.target.value)} className={`${inputClass} font-normal`} />
      </label>
      <label className={field}>
        Message
        <textarea rows={9} value={form.body} onChange={(e) => set("body", e.target.value)} className={`${inputClass} h-auto py-3 font-normal`} />
        <span className="mt-1 block text-xs font-normal text-ink-soft">Leave a blank line between paragraphs. Plain text; the design is added for you.</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          Button words (optional)
          <input value={form.buttonLabel} onChange={(e) => set("buttonLabel", e.target.value)} className={`${inputClass} font-normal`} placeholder="e.g. Shop Valentine's gifts" />
        </label>
        <label className={field}>
          Button link
          <input value={form.buttonUrl} onChange={(e) => set("buttonUrl", e.target.value)} className={`${inputClass} font-normal`} placeholder="/shop or https://…" />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => start(async () => void (await save()))} className={adminButtonQuiet}>
          Save draft
        </button>
        <button type="button" disabled={busy} onClick={() => start(showPreview)} className={adminButtonQuiet}>
          Preview
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const id = await save();
              if (!id) return;
              const r = await sendTestEmail(id);
              setMsg(r);
              router.refresh();
              if (r.ok) await showPreview();
            })
          }
          className={adminButton}
        >
          Send me a test
        </button>
      </div>

      <div className="rounded-xl border border-rule p-4">
        <p className="text-sm text-ink">
          {audienceSize === 0
            ? "Nobody has agreed to updates yet. People join by ticking the box at checkout."
            : `Goes to ${audienceSize} ${audienceSize === 1 ? "person" : "people"} who agreed to updates${
                audienceSize > perDay ? `, ${perDay} a day, so about ${Math.ceil(audienceSize / perDay)} days to reach everyone` : ""
              }.`}
        </p>
        {!isOwner && <p className="mt-1 text-sm text-ink-soft">Only the owner can send to customers. Save and test it, then ask them.</p>}
        {isOwner && (!draft?.tested || unsaved) && <p className="mt-1 text-sm text-ink-soft">Send yourself a test of this version first.</p>}
        <button
          type="button"
          disabled={busy || !canSend}
          onClick={() =>
            draft &&
            window.confirm(`Send "${draft.subject}" to ${audienceSize} ${audienceSize === 1 ? "person" : "people"}? This can't be undone.`) &&
            start(async () => {
              const r = await sendToEveryone(draft.id);
              setMsg(r);
              router.refresh();
            })
          }
          className={`${adminButton} mt-3`}
        >
          Send to everyone
        </button>
      </div>

      {draft && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            window.confirm("Delete this draft?") &&
            start(async () => {
              const r = await deleteEmailDraft(draft.id);
              setMsg(r);
              if (r.ok) onDeleted();
            })
          }
          className="justify-self-start text-sm text-oxblood underline underline-offset-2"
        >
          Delete draft
        </button>
      )}

      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-ink" : "text-oxblood"}`}>
          {msg.message}
        </p>
      )}
      <Preview html={html} />
    </form>
  );
}

/** Emails to customers who agreed to updates: write, preview, test, then (owner) send. */
export function EmailsManager({
  broadcasts,
  audienceSize,
  perDay,
  isOwner,
}: {
  broadcasts: BroadcastRow[];
  audienceSize: number;
  perDay: number;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | "new">(broadcasts.find((b) => b.status === "draft")?.id ?? "new");
  const current = selected === "new" ? null : (broadcasts.find((b) => b.id === selected) ?? null);
  // The editor starts afresh only when someone picks a different email, not when a new draft gets its id.
  const [editorKey, setEditorKey] = useState(0);
  const pick = (id: string | "new") => {
    setSelected(id);
    setEditorKey((k) => k + 1);
  };

  return (
    <div>
      <AdminHeader
        title="Emails"
        intro={`Updates to customers who ticked "Send me updates" at checkout (${audienceSize} now). Every email has an unsubscribe link. Up to ${perDay} go out a day so order emails always have room.`}
        action={
          <button type="button" onClick={() => pick("new")} className={adminButton}>
            New email
          </button>
        }
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[20rem_1fr]">
        <Card className="self-start">
          {broadcasts.length === 0 ? (
            <p className="text-sm text-ink-soft">No emails yet.</p>
          ) : (
            <ul className="-my-2 divide-y divide-rule">
              {broadcasts.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => pick(b.id)}
                    aria-current={b.id === selected}
                    className={`flex w-full flex-col gap-1 py-3 text-left ${b.id === selected ? "text-oxblood" : ""}`}
                  >
                    <span className="truncate font-semibold">{b.subject}</span>
                    <span className="flex items-center gap-2 text-xs text-ink-soft">
                      <StatusBadge b={b} />
                      {b.status === "draft" ? `by ${b.createdBy}` : `${b.sent} of ${b.total} sent`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          {current && current.status !== "draft" ? (
            <SentView key={current.id} b={current} />
          ) : (
            <Editor
              key={editorKey}
              draft={current}
              audienceSize={audienceSize}
              perDay={perDay}
              isOwner={isOwner}
              onSaved={(id) => {
                setSelected(id);
                router.refresh();
              }}
              onDeleted={() => {
                pick("new");
                router.refresh();
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
