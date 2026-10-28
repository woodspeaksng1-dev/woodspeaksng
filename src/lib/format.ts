const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export const formatNaira = (amount: number) => naira.format(amount);

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Cuts text after the `max`-th word, keeping its spacing; shorter text is returned unchanged. */
export function clampWords(text: string, max: number) {
  let count = 0;
  for (const m of text.matchAll(/\S+/g)) {
    count++;
    if (count === max) {
      const end = m.index + m[0].length;
      // Allow the space after the last word only while there is nothing beyond it.
      return /\S/.test(text.slice(end)) ? text.slice(0, end) : text;
    }
  }
  return text;
}
