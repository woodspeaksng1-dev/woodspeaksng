import "server-only";
import { formatNaira } from "@/lib/format";
import type { StoredOrder } from "@/lib/orders";
import type { CartCustomization } from "@/lib/types";
import { escapeHtml as e, sendEmail } from "./email";

/*
 * The two emails sent when an order is paid: a confirmation to the buyer, and an alert to the
 * Woodspeaks team (ORDER_NOTIFICATION_EMAIL) with everything needed to make and deliver it.
 * Plain, readable HTML with inline styles: email apps ignore stylesheets and CSS variables, so the brand
 * colours appear here as hex (the one exception to the token rule). Every value is escaped.
 */

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(y, m - 1, d),
  );
};

function personalisation(c: CartCustomization): string {
  switch (c.kind) {
    case "letter":
      return c.text;
    case "reasons":
      return c.mode === "custom" ? c.reasons.map((r, i) => `${i + 1}. ${r}`).join("\n") : "Our standard 20 reasons";
    case "photo":
      return `Photo: ${c.photoNames.join(", ")}`;
    case "video":
      return c.source === "file" ? `Video file: ${c.fileName} (${c.sizeMb} MB)` : `Video link: ${c.url}`;
    default:
      return "";
  }
}

const page = (body: string) =>
  `<div style="font-family:Georgia,'Times New Roman',serif;color:#2a1712;background:#eee2cb;padding:24px">` +
  `<div style="max-width:560px;margin:0 auto;background:#f8f2e6;border-radius:16px;padding:28px">${body}</div></div>`;

const linesTable = (order: StoredOrder, withPersonalisation: boolean) =>
  `<table style="width:100%;border-collapse:collapse;font-size:15px">` +
  order.lines
    .map((l) => {
      const p = withPersonalisation ? personalisation(l.customization) : "";
      return (
        `<tr><td style="padding:8px 0;border-bottom:1px solid #d8c8aa;vertical-align:top">${e(l.name)}${l.quantity > 1 ? ` × ${l.quantity}` : ""}` +
        (p ? `<div style="margin-top:6px;white-space:pre-line;color:#6b5446;font-style:italic">${e(p)}</div>` : "") +
        `</td><td style="padding:8px 0;border-bottom:1px solid #d8c8aa;text-align:right;vertical-align:top">${formatNaira(l.lineTotal)}</td></tr>`
      );
    })
    .join("") +
  `<tr><td style="padding:8px 0">Delivery (${e(order.delivery.zoneName)})</td><td style="padding:8px 0;text-align:right">${formatNaira(order.deliveryFee)}</td></tr>` +
  `<tr><td style="padding:8px 0;font-size:18px"><strong>Total paid</strong></td><td style="padding:8px 0;text-align:right;font-size:18px"><strong>${formatNaira(order.total)}</strong></td></tr>` +
  `</table>`;

const linesText = (order: StoredOrder, withPersonalisation: boolean) =>
  order.lines
    .map((l) => {
      const p = withPersonalisation ? personalisation(l.customization) : "";
      return `${l.name}${l.quantity > 1 ? ` x ${l.quantity}` : ""}: ${formatNaira(l.lineTotal)}${p ? `\n${p}` : ""}`;
    })
    .join("\n\n") + `\n\nDelivery (${order.delivery.zoneName}): ${formatNaira(order.deliveryFee)}\nTotal paid: ${formatNaira(order.total)}`;

function customerEmail(order: StoredOrder, siteUrl: string) {
  const first = order.customer.name.split(" ")[0];
  const to = order.recipient?.name ?? order.customer.name;
  const link = `${siteUrl}/checkout/confirmation?reference=${order.number}`;
  return {
    to: order.customer.email,
    subject: `Your Woodspeaks order ${order.number}`,
    html: page(
      `<p style="font-size:14px;color:#6b5446;margin:0">Order ${e(order.number)}</p>` +
        `<h1 style="font-size:26px;color:#4a1420;margin:8px 0 16px">Thank you, ${e(first)}</h1>` +
        `<p style="font-size:16px;line-height:1.5">We've received your payment and started on your order. ` +
        `We'll deliver to ${e(to)} in ${e(order.delivery.zoneName)} on <strong>${e(longDate(order.delivery.date))}</strong>.</p>` +
        linesTable(order, true) +
        `<p style="font-size:14px;line-height:1.5;color:#6b5446;margin-top:20px">Spotted a mistake in your words? Reply to this email straight away, before we start making it. ` +
        `You can see your order any time at <a href="${e(link)}" style="color:#4a1420">${e(link)}</a>.</p>`,
    ),
    text:
      `Thank you, ${first}. We've received your payment for order ${order.number}.\n` +
      `We'll deliver to ${to} in ${order.delivery.zoneName} on ${longDate(order.delivery.date)}.\n\n${linesText(order, true)}\n\n` +
      `Spotted a mistake in your words? Reply to this email straight away.\n${link}`,
  };
}

function teamEmail(order: StoredOrder, to: string) {
  const r = order.recipient;
  const rows: [string, string][] = [
    ["Buyer", `${order.customer.name}, ${order.customer.phone}, ${order.customer.email}`],
    ["Deliver to", r ? `${r.name}, ${r.phone} (a gift from the buyer)` : "The buyer"],
    ["Area", order.delivery.zoneName],
    ["Address", order.delivery.address + (order.delivery.landmark ? ` (near ${order.delivery.landmark})` : "")],
    ["Delivery date", longDate(order.delivery.date)],
    ["Price in package", order.delivery.hidePrice ? "No, hide the price" : "Yes"],
    ...(order.nfc ? [["NFC tag", "Put the buyer's video on the tag before dispatch"] as [string, string]] : []),
    ["Paid by", order.paystack?.channel ?? "Paystack"],
  ];
  return {
    to,
    subject: `New order ${order.number}: ${formatNaira(order.total)} for ${longDate(order.delivery.date)}`,
    replyTo: order.customer.email,
    html: page(
      `<h1 style="font-size:24px;color:#4a1420;margin:0 0 16px">New paid order ${e(order.number)}</h1>` +
        `<table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:20px">` +
        rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b5446;vertical-align:top;white-space:nowrap">${e(k)}</td><td style="padding:4px 0">${e(v)}</td></tr>`).join("") +
        `</table>` +
        linesTable(order, true),
    ),
    text: `New paid order ${order.number}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${linesText(order, true)}`,
  };
}

/** The one status email (client's choice): the order is on its way. Errors are logged, not thrown. */
export async function sendDispatchedEmail(order: StoredOrder) {
  const first = order.customer.name.split(" ")[0];
  const to = order.recipient?.name ?? order.customer.name;
  const items = order.lines.map((l) => l.name).join(", ");
  await sendEmail({
    to: order.customer.email,
    subject: `Your Woodspeaks order ${order.number} is on its way`,
    html: page(
      `<p style="font-size:14px;color:#6b5446;margin:0">Order ${e(order.number)}</p>` +
        `<h1 style="font-size:26px;color:#4a1420;margin:8px 0 16px">It's on its way, ${e(first)}</h1>` +
        `<p style="font-size:16px;line-height:1.5">${e(items)} ${order.lines.length > 1 ? "have" : "has"} left our workshop and ` +
        `${order.lines.length > 1 ? "are" : "is"} heading to ${e(to)} in ${e(order.delivery.zoneName)}. ` +
        `Our rider will call ${order.recipient ? e(order.recipient.name) : "you"} on arrival.</p>` +
        `<p style="font-size:14px;line-height:1.5;color:#6b5446">Questions about delivery? Reply to this email.</p>`,
    ),
    text:
      `It's on its way, ${first}. ${items} ${order.lines.length > 1 ? "have" : "has"} left our workshop and ` +
      `${order.lines.length > 1 ? "are" : "is"} heading to ${to} in ${order.delivery.zoneName}. Our rider will call on arrival.\n` +
      `Order ${order.number}. Questions? Reply to this email.`,
  }).catch((error) => console.error(`Order ${order.number}: dispatched email failed.`, error));
}

/** Sends both emails; a failure of one doesn't stop the other. Errors are logged, not thrown. */
export async function sendPaidOrderEmails(order: StoredOrder, siteUrl: string) {
  const team = process.env.ORDER_NOTIFICATION_EMAIL;
  const results = await Promise.allSettled([
    sendEmail(customerEmail(order, siteUrl)),
    team ? sendEmail(teamEmail(order, team)) : Promise.reject(new Error("ORDER_NOTIFICATION_EMAIL is not set.")),
  ]);
  for (const r of results) if (r.status === "rejected") console.error(`Order ${order.number}: email failed.`, r.reason);
}
