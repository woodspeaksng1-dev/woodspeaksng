"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { deleteAddress, saveAddress } from "@/app/(site)/account/actions";
import { formatNaira } from "@/lib/format";
import { STATUS_FLOW, STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import type { CustomerOrderRow, CustomerProfile } from "@/lib/account";
import { useCatalog } from "../catalog/CatalogProvider";
import { inputClass } from "../ui/FormField";

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));

function Tracker({ status }: { status: OrderStatus }) {
  if (status === "cancelled") return <p className="mt-4 text-sm text-ink-soft">This order was cancelled.</p>;
  const at = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  return (
    <ol className="mt-4 grid grid-cols-4 gap-1" aria-label={`Order status: ${STATUS_LABEL[status]}`}>
      {STATUS_FLOW.map((s, i) => (
        <li key={s} className="text-center">
          <span className={`block h-1.5 rounded-full ${i <= at ? "bg-oxblood" : "bg-rule"}`} />
          <span className={`mt-1.5 block text-xs ${i === at ? "font-semibold text-oxblood" : "text-ink-soft"}`}>{STATUS_LABEL[s]}</span>
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

const EMPTY = { label: "", zoneId: "", address: "", landmark: "" };

function Addresses({ profile }: { profile: CustomerProfile }) {
  const router = useRouter();
  const { zones } = useCatalog();
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? "Area no longer listed";
  const run = (action: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      const r = await action();
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <Panel title="Saved addresses">
      {profile.addresses.length === 0 && !adding && <p className="text-ink-soft">Save an address and checkout fills it in for you.</p>}
      <ul className="divide-y divide-rule">
        {profile.addresses.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="block font-semibold">{a.label}</span>
              <span className="block text-sm text-ink-soft">
                {a.address}
                {a.landmark && ` (near ${a.landmark})`} · {zoneName(a.zoneId)}
              </span>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => deleteAddress(a.id))}
              className="shrink-0 text-sm text-oxblood underline underline-offset-2"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => saveAddress(form),
              () => {
                setForm(EMPTY);
                setAdding(false);
              },
            );
          }}
          className="mt-4 grid gap-3"
        >
          <input
            aria-label="Name for this address"
            placeholder="Name, e.g. Home or Mum's"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className={inputClass}
          />
          <select aria-label="Delivery area" value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className={inputClass}>
            <option value="">Choose an area</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <textarea
            aria-label="Full address"
            placeholder="Full address"
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={`${inputClass} h-auto py-3`}
          />
          <input
            aria-label="Nearest landmark (optional)"
            placeholder="Nearest landmark (optional)"
            value={form.landmark}
            onChange={(e) => setForm({ ...form, landmark: e.target.value })}
            className={inputClass}
          />
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="h-11 rounded-full bg-oxblood px-6 text-vellum transition-colors hover:bg-wine disabled:opacity-50">
              Save address
            </button>
            <button type="button" onClick={() => setAdding(false)} className="h-11 px-4 text-ink-soft underline underline-offset-2">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        profile.addresses.length < 5 && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setMsg(null);
            }}
            className="mt-4 text-sm text-oxblood underline underline-offset-2"
          >
            Add an address
          </button>
        )
      )}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-sm ${msg.ok ? "text-ink-soft" : "text-oxblood"}`}>
          {msg.text}
        </p>
      )}
    </Panel>
  );
}

/** A signed-in customer's account: their orders (found by email, guest orders included) and saved addresses. */
export function AccountDashboard({ orders, profile }: { orders: CustomerOrderRow[]; profile: CustomerProfile }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const first = (profile.name ?? profile.email).split(/[ @]/)[0];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl text-oxblood md:text-5xl">Hello, {first}</h1>
          <p className="mt-2 text-ink-soft">{profile.email}</p>
        </div>
        <button
          type="button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await fetch("/api/account/session", { method: "DELETE" }).catch(() => {});
            router.refresh();
          }}
          className="text-sm text-oxblood underline decoration-gold/60 underline-offset-4 hover:decoration-oxblood"
        >
          Sign out
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[3fr_2fr]">
        <Panel title="Your orders">
          {orders.length === 0 ? (
            <p className="text-ink-soft">
              No orders with {profile.email} yet. Orders you place with this email appear here, including ones from before you signed in.{" "}
              <Link href="/shop" className="text-oxblood underline underline-offset-2">
                Find a gift
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-6">
              {orders.map((o) => (
                <li key={o.number} className="border-b border-rule pb-6 last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-xl">{o.items}</p>
                    <p className="text-sm text-ink-soft tabular-nums">{formatNaira(o.total)}</p>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {o.number} · ordered {day(o.createdAt)} · {o.status === "delivered" ? "delivered to" : "for"} {o.zoneName}, {day(o.deliveryDate)}
                  </p>
                  <Tracker status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Addresses profile={profile} />
      </div>
    </div>
  );
}
