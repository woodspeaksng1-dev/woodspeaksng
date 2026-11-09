"use client";

import Link from "next/link";
import { useState } from "react";
import { getProduct, getZone } from "@/lib/catalog";
import { formatNaira } from "@/lib/format";
import { NFC_LABEL, STATUS_FLOW, STATUS_LABEL, orderTotal, statusBlock, useAdmin } from "@/lib/admin/store";
import { shortDate, shortDateTime } from "@/lib/admin/format";
import type { AdminOrder } from "@/lib/admin/sample-data";
import { Badge, Card, adminButton, adminButtonQuiet } from "./AdminShell";

function Personalisation({ line }: { line: AdminOrder["lines"][number] }) {
  const c = line.customization;
  if (c.kind === "letter")
    return <p className="mt-2 rounded-xl bg-parchment/60 p-4 font-display whitespace-pre-line italic">{c.text}</p>;
  if (c.kind === "reasons")
    return c.mode === "custom" ? (
      <ol className="mt-2 grid list-decimal gap-x-8 gap-y-0.5 rounded-xl bg-parchment/60 p-4 pl-10 sm:grid-cols-2">
        {c.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ol>
    ) : (
      <p className="mt-1 text-ink-soft">Our standard 20 reasons</p>
    );
  if (c.kind === "photo")
    return (
      <p className="mt-1 text-ink-soft">
        Photo: {c.photoNames[0] ?? "missing"}
        {c.crop && ` · zoom ${c.crop.zoom.toFixed(2)}, offset ${Math.round(c.crop.x)}%, ${Math.round(c.crop.y)}%`}
      </p>
    );
  if (c.kind === "video")
    return (
      <p className="mt-1 break-all text-ink-soft">
        {c.source === "file" ? `Video: ${c.fileName} (${c.sizeMb} MB)` : `Video link: ${c.url}`}
      </p>
    );
  return null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function OrderDetail({ number }: { number: string }) {
  const order = useAdmin((s) => s.orders.find((o) => o.number === number));
  const setStatus = useAdmin((s) => s.setStatus);
  const setNfc = useAdmin((s) => s.setNfc);
  const [message, setMessage] = useState<string | null>(null);

  if (!order)
    return (
      <p className="py-20 text-center text-ink-soft">
        Order {number} isn&rsquo;t in the sample data.{" "}
        <Link href="/admin/orders" className="text-oxblood underline">
          Back to orders
        </Link>
      </p>
    );

  const next = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
  const block = next ? statusBlock(order, next) : null;
  const nfcVideo = order.lines.map((l) => l.customization).find((c) => c.kind === "video");

  return (
    <div>
      <Link href="/admin/orders" className="-my-2.5 inline-block py-2.5 text-sm text-ink-soft underline underline-offset-2 print:hidden">
        All orders
      </Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl text-oxblood tabular-nums">{order.number}</h1>
          <p className="mt-1 text-ink-soft">
            Placed {shortDateTime(order.placedAt)} · {formatNaira(orderTotal(order))} paid
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className={`${adminButtonQuiet} print:hidden`}>
          Print order sheet
        </button>
      </header>

      <Card className="mt-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ol className="flex flex-wrap gap-2" aria-label="Status">
            {STATUS_FLOW.map((s) => (
              <li key={s}>
                <Badge tone={s === order.status ? "wine" : STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(order.status) ? "neutral" : "quiet"}>
                  {STATUS_LABEL[s]}
                </Badge>
              </li>
            ))}
          </ol>
          {next ? (
            <button
              type="button"
              disabled={!!block}
              onClick={() => setMessage(setStatus(order.number, next) ?? `Marked as ${STATUS_LABEL[next].toLowerCase()}. The customer was emailed.`)}
              className={adminButton}
            >
              Mark as {STATUS_LABEL[next].toLowerCase()}
            </button>
          ) : (
            <p className="text-ink-soft">Delivered. Nothing more to do.</p>
          )}
        </div>
        {(block || message) && (
          <p role="status" className="mt-3 text-sm text-oxblood">
            {block ?? message}
          </p>
        )}
      </Card>

      {order.nfc && (
        <Card className="mt-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl text-oxblood">NFC tag video</h2>
            <Badge tone="gold">{NFC_LABEL[order.nfc.status]}</Badge>
          </div>
          {nfcVideo?.kind === "video" && nfcVideo.source === "file" && (
            <p className="mt-3">
              File: <span className="font-semibold">{nfcVideo.fileName}</span> ({nfcVideo.sizeMb} MB)
              <span className="mt-1 block text-sm text-ink-soft">The download button arrives with the backend.</span>
            </p>
          )}
          {nfcVideo?.kind === "video" && nfcVideo.source === "link" && (
            <p className="mt-3 break-all">
              Link:{" "}
              {/* Customer input: only ever a web link (checked when entered, and again here). */}
              {/^https?:\/\//i.test(nfcVideo.url) ? (
                <a href={nfcVideo.url} target="_blank" rel="noopener noreferrer nofollow" className="text-oxblood underline">
                  {nfcVideo.url}
                </a>
              ) : (
                nfcVideo.url
              )}
            </p>
          )}
          {order.nfc.status === "to-write" && (
            <button type="button" onClick={() => setNfc(order.number, "written")} className={`mt-4 ${adminButton}`}>
              Mark tag as written
            </button>
          )}
        </Card>
      )}

      <Card className="mt-4 print:shadow-none">
        <h2 className="text-2xl text-oxblood">What to make</h2>
        <ul className="mt-2 divide-y divide-rule">
          {order.lines.map((l, i) => {
            const p = getProduct(l.productId);
            return (
              <li key={i} className="py-4">
                <p className="font-display text-xl">
                  {p?.name ?? l.productId}
                  {l.quantity > 1 && <span className="text-ink-soft"> × {l.quantity}</span>}
                </p>
                <Personalisation line={l} />
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="print:shadow-none">
          <h2 className="text-2xl text-oxblood">Delivery</h2>
          <dl className="mt-2">
            <Row label="Deliver on">{shortDate(order.deliveryDate)}</Row>
            <Row label="Area">{getZone(order.zoneId)?.name}</Row>
            <Row label="Address">{order.address}</Row>
            {order.landmark && <Row label="Landmark">{order.landmark}</Row>}
            <Row label="Price in box">{order.hidePrice ? "No, leave it out" : "Yes"}</Row>
          </dl>
        </Card>
        <Card className="print:shadow-none">
          <h2 className="text-2xl text-oxblood">People</h2>
          <dl className="mt-2">
            <Row label="Buyer">
              {order.customer.name}
              <span className="block text-sm text-ink-soft">
                {order.customer.email} · {order.customer.phone}
              </span>
            </Row>
            <Row label="Recipient">
              {order.recipient ? (
                <>
                  {order.recipient.name}
                  <span className="block text-sm text-ink-soft">{order.recipient.phone}</span>
                </>
              ) : (
                "The buyer"
              )}
            </Row>
            <Row label="Emails">{order.customer.optIn ? "Opted in to updates" : "Order emails only"}</Row>
          </dl>
        </Card>
      </div>
    </div>
  );
}
