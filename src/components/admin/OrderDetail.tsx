"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveOrderOn, nfcWritten } from "@/app/admin/(panel)/orders/actions";
import { PhotoFrame } from "@/components/customizer/PhotoEditor";
import { whatsappToCustomer } from "@/lib/contact";
import { formatNaira } from "@/lib/format";
import { fileStillNeeded } from "@/lib/uploads";
import { STATUS_FLOW, STATUS_LABEL, nextStatus, statusBlock, type StoredOrder } from "@/lib/orders";
import { shortDate, shortDateTime } from "@/lib/admin/format";
import { Badge, Card, adminButton, adminButtonQuiet } from "./AdminShell";

type Line = StoredOrder["lines"][number];

/** The buyer's file for a line: a download link, or, if they're sending it on WhatsApp, a way to chase it. */
function FileOnLine({ id, kind, files, askBuyer }: { id: string | undefined; kind: "photo" | "video"; files: Record<string, string>; askBuyer: string | null }) {
  const url = id ? files[id] : undefined;
  if (url)
    return (
      <a href={url} className="mt-2 inline-block text-sm text-oxblood underline underline-offset-2 print:hidden">
        Download the {kind} (link works for an hour; reload for a new one)
      </a>
    );
  if (id) return <span className="mt-1 block text-sm text-oxblood">The uploaded {kind} couldn&rsquo;t be found. Ask the buyer to send it again.</span>;
  return (
    <span className="mt-1 block text-sm">
      Not uploaded: the buyer was asked to send it on WhatsApp. Check the shop&rsquo;s WhatsApp for order messages.
      {askBuyer && (
        <>
          {" "}
          <a href={askBuyer} target="_blank" rel="noopener noreferrer" className="text-oxblood underline underline-offset-2 print:hidden">
            Message the buyer
          </a>
        </>
      )}
    </span>
  );
}

/** The personalisation, exactly as the buyer entered it, for the workshop. */
function Personalisation({ line, files, askBuyer }: { line: Line; files: Record<string, string>; askBuyer: string | null }) {
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
  if (c.kind === "photo") {
    const id = c.uploadIds?.[0];
    const url = id ? files[id] : undefined;
    return (
      <div className="mt-1 text-ink-soft">
        <p>
          Photo: {c.photoNames[0] ?? "missing"}
          {c.crop && ` · zoom ${c.crop.zoom.toFixed(2)}, offset ${Math.round(c.crop.x)}%, ${Math.round(c.crop.y)}%`}
        </p>
        {url && (
          <div className="mt-3 w-48">
            <p className="mb-2 text-sm">As the buyer placed it:</p>
            <PhotoFrame kind={line.productId === "locket" ? "locket" : "polaroid"} photo={{ url }} crop={c.crop ?? { zoom: 1, x: 0, y: 0 }} />
          </div>
        )}
        <FileOnLine id={id} kind="photo" files={files} askBuyer={askBuyer} />
      </div>
    );
  }
  if (c.kind === "video")
    return (
      <div className="mt-1 break-all text-ink-soft">
        <p>{c.source === "file" ? `Video: ${c.fileName} (${c.sizeMb} MB)` : `Video link: ${c.url}`}</p>
        {c.source === "file" && <FileOnLine id={c.uploadId} kind="video" files={files} askBuyer={askBuyer} />}
      </div>
    );
  return null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function OrderDetail({ order, files }: { order: StoredOrder; files: Record<string, string> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const next = nextStatus(order.status);
  const block = next ? statusBlock(order, next) : null;
  const nfcVideo = order.lines.map((l) => l.customization).find((c) => c.kind === "video");
  const unpaid = order.status === "pending";
  const missingFiles = order.lines.flatMap((l) => {
    const kind = fileStillNeeded(l.customization);
    return kind ? [{ name: l.name, kind }] : [];
  });
  const askBuyer = missingFiles.length
    ? whatsappToCustomer(
        order.customer.phone,
        `Hello ${order.customer.name.split(" ")[0]}, this is Woodspeaks. Thank you for order ${order.number}. To start making it, please send ${missingFiles
          .map((f) => `the ${f.kind} for the ${f.name}`)
          .join(" and ")} here, as a document so it keeps its quality.`,
      )
    : null;

  const run = (action: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });

  return (
    <div>
      <Link href="/admin/orders" className="-my-2.5 inline-block py-2.5 text-sm text-ink-soft underline underline-offset-2 print:hidden">
        All orders
      </Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl text-oxblood tabular-nums">{order.number}</h1>
          <p className="mt-1 text-ink-soft">
            Placed {shortDateTime(order.createdAt)} · {formatNaira(order.total)} {unpaid ? "not paid" : "paid"}
            {order.paystack?.channel && ` by ${order.paystack.channel.replace("_", " ")}`}
          </p>
        </div>
        {!unpaid && (
          <button type="button" onClick={() => window.print()} className={`${adminButtonQuiet} print:hidden`}>
            Print order sheet
          </button>
        )}
      </header>

      {order.paymentProblem && (
        <Card className="mt-6 border border-oxblood print:hidden">
          <h2 className="text-xl text-oxblood">Payment needs checking</h2>
          <p className="mt-2">{order.paymentProblem}</p>
          <p className="mt-1 text-sm text-ink-soft">Check this payment in the Paystack dashboard before making anything.</p>
        </Card>
      )}

      {unpaid ? (
        <Card className="mt-6 print:hidden">
          <p className="text-ink">
            <strong>Awaiting payment.</strong> The buyer started checkout but hasn&rsquo;t paid, so there&rsquo;s nothing to make.
            It moves to Paid on its own if they finish paying.
          </p>
        </Card>
      ) : (
        <Card className="mt-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <ol className="flex flex-wrap gap-2" aria-label="Status">
              {STATUS_FLOW.map((s) => (
                <li key={s}>
                  <Badge
                    tone={
                      s === order.status
                        ? "wine"
                        : STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number])
                          ? "neutral"
                          : "quiet"
                    }
                  >
                    {STATUS_LABEL[s]}
                  </Badge>
                </li>
              ))}
            </ol>
            {next ? (
              <button
                type="button"
                disabled={!!block || pending}
                onClick={() => run(() => moveOrderOn(order.number, next))}
                className={adminButton}
              >
                {pending ? "Saving…" : `Mark as ${STATUS_LABEL[next].toLowerCase()}`}
              </button>
            ) : (
              <p className="text-ink-soft">{order.status === "delivered" ? "Delivered. Nothing more to do." : STATUS_LABEL[order.status]}</p>
            )}
          </div>
          {next === "dispatched" && !block && (
            <p className="mt-3 text-sm text-ink-soft">Marking it dispatched emails the buyer that it&rsquo;s on its way.</p>
          )}
          {(block || message) && (
            <p role="status" className={`mt-3 text-sm ${message?.ok && !block ? "text-ink" : "text-oxblood"}`}>
              {block ?? message?.text}
            </p>
          )}
        </Card>
      )}

      {order.nfc && !unpaid && (
        <Card className="mt-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl text-oxblood">NFC tag video</h2>
            <Badge tone="gold">{order.nfc.status === "written" ? "Tag written" : "Tag to write"}</Badge>
          </div>
          {nfcVideo?.kind === "video" && nfcVideo.source === "file" && (
            <p className="mt-3">
              File: <span className="font-semibold">{nfcVideo.fileName}</span> ({nfcVideo.sizeMb} MB)
              <FileOnLine id={nfcVideo.uploadId} kind="video" files={files} askBuyer={askBuyer} />
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
            <button type="button" disabled={pending} onClick={() => run(() => nfcWritten(order.number))} className={`mt-4 ${adminButton}`}>
              Mark tag as written
            </button>
          )}
        </Card>
      )}

      <Card className="mt-4 print:shadow-none">
        <h2 className="text-2xl text-oxblood">What to make</h2>
        <ul className="mt-2 divide-y divide-rule">
          {order.lines.map((l, i) => (
            <li key={i} className="py-4">
              <p className="flex flex-wrap items-baseline justify-between gap-2 font-display text-xl">
                <span>
                  {l.name}
                  {l.quantity > 1 && <span className="text-ink-soft"> × {l.quantity}</span>}
                </span>
                <span className="font-sans text-sm text-ink-soft tabular-nums print:hidden">{formatNaira(l.lineTotal)}</span>
              </p>
              <Personalisation line={l} files={files} askBuyer={askBuyer} />
            </li>
          ))}
        </ul>
        <dl className="mt-2 border-t border-rule pt-3 text-sm print:hidden">
          <Row label="Items">{formatNaira(order.itemsTotal)}</Row>
          <Row label="Delivery">{formatNaira(order.deliveryFee)}</Row>
          <Row label="Total">{formatNaira(order.total)}</Row>
        </dl>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="print:shadow-none">
          <h2 className="text-2xl text-oxblood">Delivery</h2>
          <dl className="mt-2">
            <Row label="Deliver on">{shortDate(order.delivery.date)}</Row>
            <Row label="Area">{order.delivery.zoneName}</Row>
            <Row label="Address">{order.delivery.address}</Row>
            {order.delivery.landmark && <Row label="Landmark">{order.delivery.landmark}</Row>}
            <Row label="Price in box">{order.delivery.hidePrice ? "No, leave it out" : "Yes"}</Row>
          </dl>
        </Card>
        <Card className="print:shadow-none">
          <h2 className="text-2xl text-oxblood">People</h2>
          <dl className="mt-2">
            <Row label="Buyer">
              {order.customer.name}
              <span className="block text-sm text-ink-soft">
                <a href={`mailto:${order.customer.email}`} className="underline underline-offset-2">
                  {order.customer.email}
                </a>{" "}
                ·{" "}
                <a href={`tel:${order.customer.phone}`} className="underline underline-offset-2">
                  {order.customer.phone}
                </a>
              </span>
            </Row>
            <Row label="Recipient">
              {order.recipient ? (
                <>
                  {order.recipient.name}
                  <span className="block text-sm text-ink-soft">
                    <a href={`tel:${order.recipient.phone}`} className="underline underline-offset-2">
                      {order.recipient.phone}
                    </a>
                  </span>
                </>
              ) : (
                "The buyer"
              )}
            </Row>
            <Row label="Emails">{order.customer.marketingOptIn ? "Opted in to updates" : "Order emails only"}</Row>
          </dl>
        </Card>
      </div>
    </div>
  );
}
