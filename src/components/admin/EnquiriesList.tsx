"use client";

import { useAdmin } from "@/lib/admin/store";
import { shortDateTime } from "@/lib/admin/format";
import { AdminHeader, Badge } from "./AdminShell";

export function EnquiriesList() {
  const enquiries = useAdmin((s) => s.enquiries);
  return (
    <div>
      <AdminHeader title="Enquiries" intro="Corporate enquiries and contact form messages. They also arrive in the team inbox." />
      <ul className="mt-6 flex flex-col gap-3">
        {enquiries.map((e) => (
          <li key={e.id}>
            <details className="group rounded-2xl bg-vellum p-4 shadow-card">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block">
                    {e.company ?? e.from} <span className="text-ink-soft">· {e.summary}</span>
                  </span>
                  <span className="text-sm text-ink-soft">{shortDateTime(e.receivedAt)}</span>
                </span>
                <Badge tone={e.kind === "corporate" ? "gold" : "quiet"}>{e.kind === "corporate" ? "Corporate" : "Contact"}</Badge>
              </summary>
              <div className="mt-4 border-t border-rule pt-4">
                <p className="whitespace-pre-line">{e.message}</p>
                <p className="mt-3 text-sm text-ink-soft">
                  {e.from} · {e.email}
                </p>
                <a
                  href={`mailto:${e.email}?subject=${encodeURIComponent("Your Woodspeaks enquiry")}`}
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-oxblood px-5 text-sm text-vellum hover:bg-wine"
                >
                  Reply by email
                </a>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
