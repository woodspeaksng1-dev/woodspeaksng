const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" });
// Lagos time, whether formatted on the server (UTC) or in a browser elsewhere, so both agree.
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

/** "2026-11-02" → "2 Nov 2026" (calendar date, no time zone shift). */
export function shortDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

export const shortDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
