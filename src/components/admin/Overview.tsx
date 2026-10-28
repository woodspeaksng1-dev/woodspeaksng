"use client";

import Link from "next/link";
import { useAdmin, STATUS_LABEL } from "@/lib/admin/store";
import { shortDate } from "@/lib/admin/format";
import { AdminHeader, Card } from "./AdminShell";

export function Overview() {
  const { orders, enquiries, reminders } = useAdmin();
  const count = (s: keyof typeof STATUS_LABEL) => orders.filter((o) => o.status === s).length;
  const nfcToReview = orders.filter((o) => o.nfc?.status === "uploaded").length;
  const nfcToWrite = orders.filter((o) => o.nfc?.status === "approved").length;
  const nextReminder = [...reminders].sort((a, b) => a.date.localeCompare(b.date))[0];

  const tiles = [
    { label: "New, to start", value: count("paid"), href: "/admin/orders" },
    { label: "Being crafted", value: count("crafting"), href: "/admin/orders" },
    { label: "Out for delivery", value: count("dispatched"), href: "/admin/orders" },
    { label: "Memory uploads to review", value: nfcToReview + nfcToWrite, href: "/admin/orders" },
  ];

  return (
    <div>
      <AdminHeader title="Good day" intro="What needs your attention in the workshop today." />
      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="block rounded-2xl bg-vellum p-5 shadow-card transition-transform hover:-translate-y-0.5">
              <span className="block font-display text-4xl text-oxblood tabular-nums">{t.value}</span>
              <span className="mt-1 block text-sm text-ink-soft">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl text-oxblood">Enquiries</h2>
          <p className="mt-2 text-ink">
            {enquiries.length} waiting for a reply.{" "}
            <Link href="/admin/enquiries" className="text-oxblood underline underline-offset-2">
              Read them
            </Link>
          </p>
        </Card>
        <Card>
          <h2 className="text-2xl text-oxblood">Next reminder email</h2>
          <p className="mt-2 text-ink">
            {nextReminder ? `${nextReminder.occasion}, ${shortDate(nextReminder.date)}. It sends on its own a week before.` : "None scheduled."}
          </p>
        </Card>
      </div>
    </div>
  );
}
