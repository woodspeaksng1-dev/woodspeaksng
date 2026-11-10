"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markEnquiry } from "@/app/admin/(panel)/enquiries/actions";
import { shortDate, shortDateTime } from "@/lib/admin/format";
import { BUDGETS, type StoredEnquiry } from "@/lib/enquiry";
import { AdminHeader, Badge, Card, adminButton, adminButtonQuiet } from "./AdminShell";

function Row({ enquiry: q }: { enquiry: StoredEnquiry }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const handled = q.status === "handled";
  const subject = q.kind === "corporate" ? `Your corporate gifting enquiry` : `Your message to Woodspeaks`;

  return (
    <li className="py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-xl">
          {q.kind === "corporate" ? q.company : q.name}
          <span className="ml-3 align-middle">
            <Badge tone={q.kind === "corporate" ? "gold" : "quiet"}>{q.kind === "corporate" ? "Corporate" : "Contact"}</Badge>
          </span>
        </p>
        <p className="text-sm text-ink-soft">{shortDateTime(q.createdAt)}</p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {q.kind === "corporate" && `${q.name} · `}
        <a href={`mailto:${q.email}?subject=${encodeURIComponent(subject)}`} className="text-oxblood underline underline-offset-2">
          {q.email}
        </a>
        {q.phone && (
          <>
            {" · "}
            <a href={`tel:${q.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-2">
              {q.phone}
            </a>
          </>
        )}
      </p>
      {q.kind === "corporate" && (
        <p className="mt-2 text-sm">
          {q.quantity} gifts · {BUDGETS[q.budget]} · needed by {shortDate(q.dateNeeded)}
        </p>
      )}
      {q.message && <p className="mt-3 whitespace-pre-line">{q.message}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href={`mailto:${q.email}?subject=${encodeURIComponent(subject)}`} className={adminButton}>
          Reply by email
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await markEnquiry(q.id, !handled);
              setError(r.ok ? null : r.message);
              if (r.ok) router.refresh();
            })
          }
          className={adminButtonQuiet}
        >
          {handled ? "Move back to new" : "Mark handled"}
        </button>
        {handled && q.handledBy && (
          <span className="text-sm text-ink-soft">
            Handled by {q.handledBy}
            {q.handledAt && `, ${shortDate(q.handledAt.slice(0, 10))}`}
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-oxblood">
          {error}
        </p>
      )}
    </li>
  );
}

/** Contact and corporate messages, newest first. New ones on top; handled ones behind a tab. */
export function EnquiriesList({ enquiries }: { enquiries: StoredEnquiry[] }) {
  const [tab, setTab] = useState<"new" | "handled">("new");
  const fresh = enquiries.filter((q) => q.status === "new");
  const shown = tab === "new" ? fresh : enquiries.filter((q) => q.status === "handled");

  return (
    <div>
      <AdminHeader
        title="Enquiries"
        intro={`Messages from the contact and corporate forms. Each is also emailed to the team; replying to that email answers the sender.`}
      />
      <div className="mt-6 flex gap-2" role="tablist" aria-label="Enquiries">
        {(["new", "handled"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-9 rounded-full px-4 text-sm ${tab === t ? "bg-oxblood text-vellum" : "text-ink-soft ring-1 ring-rule"}`}
          >
            {t === "new" ? `New (${fresh.length})` : "Handled"}
          </button>
        ))}
      </div>
      <Card className="mt-4">
        {shown.length === 0 ? (
          <p className="text-ink-soft">{tab === "new" ? "Nothing waiting. New messages appear here." : "Nothing handled yet."}</p>
        ) : (
          <ul className="divide-y divide-rule">
            {shown.map((q) => (
              <Row key={q.id} enquiry={q} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
