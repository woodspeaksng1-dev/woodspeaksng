"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { z } from "zod";
import { formatNaira } from "@/lib/format";
import { TextField, inputClass } from "../ui/FormField";

/*
 * DEMO until Firebase Auth email links and Firestore exist (backend stage). Sign-in sends
 * nothing; "Open a sample account" shows the layout with SAMPLE data, labelled as such.
 */

const STEPS = ["Paid", "Crafting", "Dispatched", "Delivered"] as const;
type Status = (typeof STEPS)[number];

const SAMPLE_ORDERS: { number: string; placed: string; items: string; total: number; status: Status; delivery: string }[] = [
  { number: "WS-K7P2QD", placed: "24 Oct 2026", items: "Handcrafted Love Scroll", total: 15590, status: "Crafting", delivery: "Friday, 30 October" },
  { number: "WS-3HN8XA", placed: "14 Feb 2026", items: "20 Reasons I Love You Puzzle, Locket", total: 54200, status: "Delivered", delivery: "Delivered 16 February" },
];

function Tracker({ status }: { status: Status }) {
  const at = STEPS.indexOf(status);
  return (
    <ol className="mt-4 grid grid-cols-4 gap-1" aria-label={`Order status: ${status}`}>
      {STEPS.map((s, i) => (
        <li key={s} className="text-center">
          <span className={`block h-1.5 rounded-full ${i <= at ? "bg-oxblood" : "bg-rule"}`} />
          <span className={`mt-1.5 block text-xs ${i === at ? "font-semibold text-oxblood" : "text-ink-soft"}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.6rem] bg-vellum p-6 shadow-card" aria-label={title}>
      <h2 className="text-2xl text-oxblood">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const quiet = "text-sm text-oxblood underline decoration-gold/60 underline-offset-4 hover:decoration-oxblood";

function SampleAccount({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [reminders, setReminders] = useState([{ id: "r1", label: "Anniversary", date: "14 Feb 2027" }]);
  return (
    <div>
      <p className="rounded-xl border border-rule bg-vellum px-4 py-3 text-sm text-ink-soft">
        Sample account: this shows how your account will look once sign-in is connected.
      </p>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl text-oxblood md:text-5xl">Your account</h1>
          <p className="mt-2 text-ink-soft">{email}</p>
        </div>
        <button type="button" onClick={onSignOut} className={quiet}>
          Sign out
        </button>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <Panel title="Your orders">
            <ul className="flex flex-col divide-y divide-rule">
              {SAMPLE_ORDERS.map((o) => (
                <li key={o.number} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-display text-lg">{o.items}</p>
                    <p className="tabular-nums">{formatNaira(o.total)}</p>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {o.number} · Ordered {o.placed} · {o.status === "Delivered" ? o.delivery : `Arriving ${o.delivery}`}
                  </p>
                  <Tracker status={o.status} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="Saved addresses">
          <p className="text-ink">12 Example Street, Lekki Phase 1</p>
          <p className="text-sm text-ink-soft">Lagos Island, Lekki, Ajah · Near the roundabout</p>
          <div className="mt-4 flex gap-5">
            <button type="button" className={quiet}>
              Edit
            </button>
            <button type="button" className={quiet}>
              Add an address
            </button>
          </div>
        </Panel>

        <Panel title="Gift reminders">
          {reminders.length ? (
            <ul className="flex flex-col gap-3">
              {reminders.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-ink">{r.label}</span>
                    <span className="text-sm text-ink-soft">We&rsquo;ll email you a week before {r.date}</span>
                  </span>
                  <button type="button" onClick={() => setReminders((rs) => rs.filter((x) => x.id !== r.id))} className={quiet}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">No reminders. You can add one after your next order.</p>
          )}
        </Panel>

        <div className="md:col-span-2">
          <Panel title="NFC tag videos">
            <p className="text-ink-soft">
              When you add an NFC tag to a gift, you add your video, or a link to it, as you personalise the tag. We put
              it on the tag before we send your gift.
            </p>
            <Link href="/products/nfc-memory-tag" className={`mt-4 inline-block ${quiet}`}>
              About the NFC tag
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export function AccountView() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [stage, setStage] = useState<"signin" | "sent" | "account">("signin");

  if (stage === "account") return <SampleAccount email={email} onSignOut={() => setStage("signin")} />;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-4xl text-oxblood md:text-5xl">Your account</h1>
      {stage === "signin" ? (
        <form
          noValidate
          className="mt-8 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            const r = emailSchema.safeParse(email);
            if (!r.success) return setError(r.error.issues[0].message);
            setEmail(r.data);
            setStage("sent");
          }}
        >
          <p className="text-lg text-ink-soft">
            Track your orders, keep your addresses and manage gift reminders. Use the email you ordered with.
          </p>
          <TextField label="Email" hint="We'll email you a link to sign in. No password needed." error={error}>
            {(p) => (
              <input
                {...p}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(undefined);
                }}
                className={inputClass}
              />
            )}
          </TextField>
          <button type="submit" className="h-12 rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine">
            Email me a sign-in link
          </button>
        </form>
      ) : (
        <div className="mt-8" role="status">
          <p className="text-lg text-ink">
            In the finished site, a sign-in link goes to <strong>{email}</strong>. Sign-in isn&rsquo;t connected yet, so
            no email was sent.
          </p>
          <button
            type="button"
            onClick={() => setStage("account")}
            className="mt-6 h-12 w-full rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine"
          >
            Open a sample account
          </button>
          <button type="button" onClick={() => setStage("signin")} className={`mt-4 ${quiet}`}>
            Use a different email
          </button>
        </div>
      )}
    </div>
  );
}
