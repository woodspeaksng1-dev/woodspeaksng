import "server-only";
import { randomUUID } from "node:crypto";
import { BUDGETS, type EnquiryRequest, type StoredEnquiry } from "@/lib/enquiry";
import { logActivity } from "./admin-activity";
import { escapeHtml as e, sendEmail } from "./email";
import { db } from "./firebase";

/*
 * Messages from the contact and corporate forms. Saved first (so nothing is lost if email fails), then
 * the team is emailed with Reply-To set to the sender. Staff mark them handled in admin.
 */

const enquiries = () => db().collection("enquiries");

export async function saveEnquiry(input: EnquiryRequest): Promise<StoredEnquiry> {
  // The honeypot is checked by the route; it's dropped here so it never reaches the database.
  const { website: _honeypot, ...fields } = input;
  void _honeypot;
  const enquiry = { ...fields, id: randomUUID(), createdAt: new Date().toISOString(), status: "new", handledBy: null, handledAt: null } as StoredEnquiry;
  await enquiries().doc(enquiry.id).create(enquiry);
  return enquiry;
}

export async function listEnquiries(limit = 200): Promise<StoredEnquiry[]> {
  const snap = await enquiries().orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as StoredEnquiry);
}

export async function setEnquiryHandled(by: string, id: string, handled: boolean): Promise<{ ok: boolean; message: string }> {
  const ref = enquiries().doc(id);
  const result = await db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return null;
    t.update(ref, handled ? { status: "handled", handledBy: by, handledAt: new Date().toISOString() } : { status: "new", handledBy: null, handledAt: null });
    return snap.data() as StoredEnquiry;
  });
  if (!result) return { ok: false, message: "That enquiry doesn't exist." };
  await logActivity(by, handled ? "Marked enquiry handled" : "Reopened enquiry", `${result.name}${result.kind === "corporate" ? `, ${result.company}` : ""}`);
  return { ok: true, message: handled ? "Marked handled." : "Moved back to new." };
}

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
};

/** Emails the team (ORDER_NOTIFICATION_EMAIL). Reply goes straight to the sender. Errors are logged, not thrown. */
export async function sendEnquiryEmail(enquiry: StoredEnquiry, adminUrl: string) {
  const to = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!to) return console.error("ORDER_NOTIFICATION_EMAIL is not set; enquiry email not sent.");
  const rows: [string, string][] = [
    ["From", `${enquiry.name}, ${enquiry.email}${enquiry.phone ? `, ${enquiry.phone}` : ""}`],
    ...(enquiry.kind === "corporate"
      ? ([
          ["Company", enquiry.company],
          ["Gifts", String(enquiry.quantity)],
          ["Budget", BUDGETS[enquiry.budget]],
          ["Needed by", longDate(enquiry.dateNeeded)],
        ] as [string, string][])
      : []),
  ];
  const title = enquiry.kind === "corporate" ? `Corporate enquiry from ${enquiry.company}` : `Message from ${enquiry.name}`;
  await sendEmail({
    to,
    replyTo: enquiry.email,
    subject: enquiry.kind === "corporate" ? `${title}: ${enquiry.quantity} gifts by ${longDate(enquiry.dateNeeded)}` : title,
    html:
      `<div style="font-family:Georgia,'Times New Roman',serif;color:#2a1712;background:#eee2cb;padding:24px">` +
      `<div style="max-width:560px;margin:0 auto;background:#f8f2e6;border-radius:16px;padding:28px">` +
      `<h1 style="font-size:22px;color:#4a1420;margin:0 0 16px">${e(title)}</h1>` +
      `<table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:16px">` +
      rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b5446;vertical-align:top;white-space:nowrap">${e(k)}</td><td style="padding:4px 0">${e(v)}</td></tr>`).join("") +
      `</table>` +
      (enquiry.message ? `<p style="font-size:16px;line-height:1.5;white-space:pre-line">${e(enquiry.message)}</p>` : "") +
      `<p style="font-size:13px;color:#6b5446;margin-top:20px">Reply to this email to answer ${e(enquiry.name)}. ` +
      `Mark it handled in <a href="${e(adminUrl)}" style="color:#4a1420">admin</a>.</p></div></div>`,
    text: `${title}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${enquiry.message}\n\nReply to this email to answer. Admin: ${adminUrl}`,
  }).catch((error) => console.error("Enquiry email failed.", error));
}
