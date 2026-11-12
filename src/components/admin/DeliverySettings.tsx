"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createZone, deleteZone, saveCraftingDays, saveZone } from "@/app/admin/(panel)/catalog-actions";
import { parseAmount } from "@/lib/admin/format";
import { formatNaira } from "@/lib/format";
import type { ShippingZone } from "@/lib/types";
import { inputClass } from "../ui/FormField";
import { AdminHeader, Card, adminButton, adminButtonQuiet } from "./AdminShell";

type Result = { ok: boolean; message: string };
const compact = `${inputClass} mt-0 h-10`;

/** One area as an editable row: name, fee, estimate, fresh items; save or remove. */
function ZoneRow({ zone }: { zone: ShippingZone }) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [fee, setFee] = useState(zone.fee == null ? "" : String(zone.fee));
  const [estimate, setEstimate] = useState(zone.estimate ?? "");
  const [perishables, setPerishables] = useState(zone.perishables);
  const [msg, setMsg] = useState<Result | null>(null);
  const [busy, start] = useTransition();
  const dirty =
    name !== zone.name || fee !== String(zone.fee ?? "") || estimate !== (zone.estimate ?? "") || perishables !== zone.perishables;

  const run = (action: () => Promise<Result>) =>
    start(async () => {
      const r = await action();
      setMsg(r);
      if (r.ok) router.refresh();
    });

  return (
    <li className="py-3">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveZone(zone.id, { name, fee: parseAmount(fee), estimate, perishables }));
        }}
        className="grid grid-cols-[1fr_6rem] items-center gap-2 sm:grid-cols-[1fr_7rem_9rem_auto_auto]"
      >
        <input aria-label="Area" value={name} onChange={(e) => setName(e.target.value)} className={compact} />
        <input
          aria-label={`Fee for ${zone.name} in naira`}
          inputMode="numeric"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className={compact}
        />
        <input
          aria-label={`Estimate for ${zone.name}`}
          placeholder="Estimate, e.g. Same day"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          className={`${compact} col-span-2 sm:col-span-1`}
        />
        <span className="col-span-2 flex items-center justify-between gap-3 sm:contents">
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              checked={perishables}
              onChange={(e) => setPerishables(e.target.checked)}
              className="h-4 w-4 accent-oxblood"
            />
            Fresh items
          </label>
          <span className="flex gap-2">
            <button type="submit" disabled={busy || !dirty} className={`${adminButton} h-10 px-4 disabled:opacity-40`}>
              Save
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm(`Remove ${zone.name}? Buyers won't be able to choose it.`) && run(() => deleteZone(zone.id))}
              className={`${adminButtonQuiet} h-10 px-4`}
            >
              Remove
            </button>
          </span>
        </span>
      </form>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-1 text-sm ${msg.ok ? "text-ink-soft" : "text-oxblood"}`}>
          {msg.message}
        </p>
      )}
    </li>
  );
}

function AddZone() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [msg, setMsg] = useState<Result | null>(null);
  const [busy, start] = useTransition();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createZone({ name, fee: parseAmount(fee), estimate: "", perishables: true });
          setMsg(r);
          if (r.ok) {
            setName("");
            setFee("");
            router.refresh();
          }
        });
      }}
      className="mt-4 border-t border-rule pt-4"
    >
      <h2 className="font-display text-xl text-oxblood">Add an area</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
        <input
          aria-label="New area name"
          placeholder="e.g. Surulere"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={compact}
        />
        <input
          aria-label="New area fee in naira"
          placeholder="Fee (₦)"
          inputMode="numeric"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className={compact}
        />
        <button type="submit" disabled={busy || !name.trim()} className={`${adminButton} h-10 px-5`}>
          Add
        </button>
      </div>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-ink" : "text-oxblood"}`}>
          {msg.message}
        </p>
      )}
    </form>
  );
}

export function DeliverySettings({ zones, craftingDays }: { zones: ShippingZone[]; craftingDays: number }) {
  const router = useRouter();
  const [days, setDays] = useState(String(craftingDays));
  const [msg, setMsg] = useState<Result | null>(null);
  const [busy, start] = useTransition();
  const fees = zones.map((z) => z.fee ?? 0);

  return (
    <div>
      <AdminHeader
        title="Delivery"
        intro={`${zones.length} areas, ${formatNaira(Math.min(...fees))} to ${formatNaira(Math.max(...fees))}. Checkout uses these straight away.`}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_18rem]">
        <Card>
          <p className="hidden gap-2 text-xs text-ink-soft sm:grid sm:grid-cols-[1fr_7rem_9rem_auto_auto]">
            <span>Area</span>
            <span>Fee (₦)</span>
            <span>Estimate</span>
          </p>
          <ul className="divide-y divide-rule">
            {zones.map((z) => (
              <ZoneRow key={z.id} zone={z} />
            ))}
          </ul>
          <AddZone />
        </Card>
        <Card className="self-start">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await saveCraftingDays(parseAmount(days));
                setMsg(r);
                if (r.ok) router.refresh();
              });
            }}
            className="flex flex-col gap-3"
          >
            <h2 className="text-2xl text-oxblood">Crafting time</h2>
            <label className="text-sm text-ink">
              Days to make an order
              <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className={inputClass} />
            </label>
            <p className="text-sm text-ink-soft">Checkout&rsquo;s earliest delivery date and the product pages use this.</p>
            <button type="submit" disabled={busy} className={adminButton}>
              Save crafting time
            </button>
            {msg && (
              <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-ink" : "text-oxblood"}`}>
                {msg.message}
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
