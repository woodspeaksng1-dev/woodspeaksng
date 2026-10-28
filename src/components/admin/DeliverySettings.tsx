"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/format";
import { useAdmin } from "@/lib/admin/store";
import type { ShippingZone } from "@/lib/types";
import { Check, TextField, inputClass } from "../ui/FormField";
import { AdminHeader, Card, adminButton } from "./AdminShell";

function ZoneForm({ zone }: { zone: ShippingZone }) {
  const updateZone = useAdmin((s) => s.updateZone);
  const [fee, setFee] = useState(zone.fee == null ? "" : String(zone.fee));
  const [estimate, setEstimate] = useState(zone.estimate ?? "");
  const [perishables, setPerishables] = useState(zone.perishables);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const n = fee.trim() === "" ? null : Number(fee);
        if (n != null && (!Number.isInteger(n) || n < 0)) return setMsg("Enter the fee in whole naira, or leave it empty.");
        updateZone(zone.id, { fee: n, estimate: estimate.trim() || null, perishables });
        setMsg(n == null ? "Saved. Checkout will show “We'll confirm the fee” for this area." : `Saved. Checkout will charge ${formatNaira(n)}.`);
      }}
      className="flex flex-col gap-4 py-5 first:pt-0"
    >
      <h3 className="font-display text-xl">{zone.name}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Fee (₦)" hint="Leave empty if not set yet.">
          {(p) => <input {...p} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} className={inputClass} />}
        </TextField>
        <TextField label="Delivery estimate" hint="e.g. Same day, or 1–2 days">
          {(p) => <input {...p} value={estimate} onChange={(e) => setEstimate(e.target.value)} className={inputClass} />}
        </TextField>
      </div>
      <Check checked={perishables} onChange={setPerishables}>
        Deliver cake, flowers and fresh roses here
      </Check>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className={adminButton}>
          Save {zone.name.split(",")[0]}
        </button>
        {msg && (
          <p role="status" className="text-sm text-ink">
            {msg}
          </p>
        )}
      </div>
    </form>
  );
}

export function DeliverySettings() {
  const { zones, craftingDays, setCraftingDays } = useAdmin();
  const [days, setDays] = useState(String(craftingDays));
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <AdminHeader title="Delivery" intro="Fees and estimates for each area, and how long gifts take to make. Once the backend is connected, checkout uses them straight away." />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <div className="divide-y divide-rule">
            {zones.map((z) => (
              <ZoneForm key={z.id} zone={z} />
            ))}
          </div>
        </Card>
        <Card className="self-start">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(days);
              if (!Number.isInteger(n) || n < 0 || n > 30) return setMsg("Enter a number of days from 0 to 30.");
              setCraftingDays(n);
              setMsg(`Saved. The earliest delivery date will be ${n} days after ordering.`);
            }}
            className="flex flex-col gap-4"
          >
            <h2 className="text-2xl text-oxblood">Crafting time</h2>
            <TextField label="Days to make an order">
              {(p) => <input {...p} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className={inputClass} />}
            </TextField>
            <button type="submit" className={adminButton}>
              Save crafting time
            </button>
            {msg && (
              <p role="status" className="text-sm text-ink">
                {msg}
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
