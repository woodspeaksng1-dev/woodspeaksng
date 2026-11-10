import { z } from "zod";

/*
 * Emails to customers who agreed to updates ("broadcasts"). Staff write plain text (no HTML): paragraphs
 * separated by a blank line, and optionally one button. The same template renders the preview, the test
 * email and the real one. Shared by the admin form and the server.
 */

/** A link on our own site ("/shop") or a full https:// link. */
const buttonUrl = z
  .string()
  .trim()
  .max(500, "That link is too long.")
  .refine((v) => v === "" || /^\/[^/\\]/.test(v) || v === "/" || /^https:\/\/[^\s]+$/.test(v), "Use a page on the site like /shop, or a full link starting with https://");

export const broadcastInput = z
  .object({
    subject: z.string().trim().min(3, "Write a subject line.").max(120, "Keep the subject under 120 characters."),
    heading: z.string().trim().max(120, "Keep the heading under 120 characters."),
    body: z.string().trim().min(10, "Write the email.").max(5000, "Keep it under 5,000 characters."),
    buttonLabel: z.string().trim().max(40, "Keep the button text under 40 characters."),
    buttonUrl,
  })
  .refine((v) => (v.buttonLabel === "") === (v.buttonUrl === ""), { message: "Give the button both its words and its link, or neither.", path: ["buttonUrl"] });

export type BroadcastContent = z.output<typeof broadcastInput>;

export type BroadcastStatus = "draft" | "sending" | "sent";

/** A broadcast as admin sees it in the list. */
export interface BroadcastRow extends BroadcastContent {
  id: string;
  status: BroadcastStatus;
  createdAt: string;
  createdBy: string;
  /** The content was test-sent exactly as it is now. */
  tested: boolean;
  testedBy: string | null;
  queuedAt: string | null;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  finishedAt: string | null;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const e = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c]);

const paragraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export const absoluteUrl = (url: string, siteUrl: string) => (url.startsWith("/") ? `${siteUrl}${url}` : url);

/**
 * The email. Inline styles and hex colours because email apps ignore stylesheets (the one exception to the
 * token rule). Everything staff typed is escaped.
 */
export function renderBroadcast(c: BroadcastContent, opts: { siteUrl: string; unsubscribeUrl: string }) {
  const button = c.buttonLabel && c.buttonUrl ? absoluteUrl(c.buttonUrl, opts.siteUrl) : null;
  const html =
    `<div style="font-family:Georgia,'Times New Roman',serif;color:#2a1712;background:#eee2cb;padding:24px">` +
    `<div style="max-width:560px;margin:0 auto;background:#f8f2e6;border-radius:16px;padding:28px">` +
    (c.heading ? `<h1 style="font-size:26px;line-height:1.2;color:#4a1420;margin:0 0 16px">${e(c.heading)}</h1>` : "") +
    paragraphs(c.body)
      .map((p) => `<p style="font-size:16px;line-height:1.6;margin:0 0 14px;white-space:pre-line">${e(p)}</p>`)
      .join("") +
    (button
      ? `<p style="margin:22px 0 8px"><a href="${e(button)}" style="display:inline-block;background:#4a1420;color:#f8f2e6;padding:12px 26px;border-radius:999px;text-decoration:none;font-size:16px">${e(c.buttonLabel)}</a></p>`
      : "") +
    `</div><p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#6b5446;text-align:center">` +
    `You're getting this because you asked for updates when you ordered from Woodspeaks. ` +
    `<a href="${e(opts.unsubscribeUrl)}" style="color:#6b5446">Unsubscribe</a>.</p></div>`;
  const text =
    [c.heading, ...paragraphs(c.body), button ? `${c.buttonLabel}: ${button}` : ""].filter(Boolean).join("\n\n") +
    `\n\n--\nYou're getting this because you asked for updates when you ordered from Woodspeaks.\nUnsubscribe: ${opts.unsubscribeUrl}`;
  return { subject: c.subject, html, text };
}
