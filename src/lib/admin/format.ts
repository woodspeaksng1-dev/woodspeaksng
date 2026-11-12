const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" });
// Lagos time, whether formatted on the server (UTC) or in a browser elsewhere, so both agree.
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

/** "2026-11-02" → "2 Nov 2026" (calendar date, no time zone shift). */
export function shortDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

export const shortDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

/**
 * A number typed into an admin box, the way people write prices: "17000", "17,000", "₦17,000", "N17 000".
 * Empty or anything else gives NaN, which the server refuses with a clear message.
 */
export function parseAmount(typed: string): number {
  const cleaned = typed.trim().replace(/^(₦|ngn|n)\s*/i, "").replace(/[,\s]/g, "");
  return /^\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}
