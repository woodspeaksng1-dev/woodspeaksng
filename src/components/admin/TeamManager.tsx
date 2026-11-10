"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, adminButton, adminButtonQuiet } from "./AdminShell";

interface Member {
  email: string;
  name: string | null;
  role: "owner" | "staff";
  addedAt: string;
}

/** The owner's list of who can sign in: add people by email, remove them (which signs them out at once). */
export function TeamManager({ me, team }: { me: string; team: Member[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const call = async (method: "POST" | "DELETE", address: string) => {
    setBusy(address);
    setMessage(null);
    const res = await fetch("/api/admin/team", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address }),
    }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { message?: string }) : {};
    setMessage({ tone: res?.ok ? "ok" : "error", text: data.message ?? "That didn't work. Try again." });
    setBusy(null);
    if (res?.ok) {
      if (method === "POST") setEmail("");
      router.refresh();
    }
  };

  return (
    <div>
      <ul className="divide-y divide-rule">
        {team.map((m) => (
          <li key={m.email} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block truncate">{m.name ?? m.email}</span>
              {m.name && <span className="block truncate text-sm text-ink-soft">{m.email}</span>}
            </span>
            <span className="flex items-center gap-3">
              <Badge tone={m.role === "owner" ? "gold" : "quiet"}>{m.role === "owner" ? "Owner" : "Staff"}</Badge>
              {m.role !== "owner" && m.email !== me && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    if (window.confirm(`Remove ${m.email}? They'll be signed out straight away.`)) call("DELETE", m.email);
                  }}
                  className={adminButtonQuiet}
                >
                  {busy === m.email ? "Removing…" : "Remove"}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          call("POST", email.trim().toLowerCase());
        }}
        className="mt-6 flex flex-col gap-3 border-t border-rule pt-6 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-sm text-ink">
          Add a member of staff
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="mt-1.5 h-11 w-full rounded-xl border border-rule bg-vellum px-3 text-ink outline-none focus:border-oxblood"
          />
        </label>
        <button type="submit" disabled={busy !== null || !email.trim()} className={adminButton}>
          {busy === email.trim().toLowerCase() ? "Adding…" : "Add"}
        </button>
      </form>
      <p className="mt-3 text-sm text-ink-soft">
        They sign in at /admin/login with Google or an email link, using this exact email. Staff can work on orders,
        products and the rest; only you can change the team.
      </p>
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`mt-3 text-sm ${message.tone === "error" ? "text-oxblood" : "text-ink"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
