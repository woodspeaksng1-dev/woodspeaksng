import { z } from "zod";
import { countWords } from "./format";

/**
 * Personalisation rules, shared by the customizer (live feedback) and,
 * later, the server (final check before an order is created).
 */

// Customers write what they like: any letters, punctuation, symbols and emoji (… “ ” & < > 😊 included).
// Only invisible control characters are refused (line breaks and tabs are fine), plus the invisible
// right-to-left override marks that can disguise text. Everything that shows this text escapes it:
// React on the site and in admin, escapeHtml in emails.
const HIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
const SAFE_TEXT = { test: (t: string) => !HIDDEN.test(t) };
const UNSUPPORTED = "Remove the hidden formatting characters (try retyping that part).";

export const letterSchema = (maxWords: number) =>
  z
    .string()
    .trim()
    .min(1, "Write your message first.")
    .refine((t) => SAFE_TEXT.test(t), UNSUPPORTED)
    .refine((t) => countWords(t) <= maxWords, `Keep it to ${maxWords} words or fewer.`);

/** A link to the buyer's video (YouTube, Google Drive, Instagram…). Web links only: never `javascript:` or `data:`. */
export const videoLinkSchema = z
  .string()
  .trim()
  .min(1, "Paste the link to your video.")
  .max(500, "That link is too long. Copy the share link instead.")
  .pipe(z.url({ protocol: /^https?$/, error: "Paste a full web link, starting with https://" }));

export const reasonsSchema = (count: number, maxWordsEach: number) =>
  z
    .array(
      z
        .string()
        .trim()
        .min(1, "Fill in every reason.")
        .refine((t) => SAFE_TEXT.test(t), UNSUPPORTED)
        .refine((t) => countWords(t) <= maxWordsEach, `Up to ${maxWordsEach} words per reason.`),
    )
    .length(count, `Write all ${count} reasons.`);
