import { z } from "zod";
import { countWords } from "./format";

/**
 * Personalisation rules, shared by the customizer (live feedback) and,
 * later, the server (final check before an order is created).
 */

// Letters, numbers, common punctuation and accented letters. No angle brackets or control characters.
const SAFE_TEXT = /^[\p{L}\p{N}\s.,!?'"’‘“”\-–—:;()&@#%+/❤]*$/u;

export const letterSchema = (maxWords: number) =>
  z
    .string()
    .trim()
    .min(1, "Write your message first.")
    .refine((t) => SAFE_TEXT.test(t), "Remove unsupported characters such as < or >.")
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
        .refine((t) => SAFE_TEXT.test(t), "Remove unsupported characters such as < or >.")
        .refine((t) => countWords(t) <= maxWordsEach, `Up to ${maxWordsEach} words per reason.`),
    )
    .length(count, `Write all ${count} reasons.`);
