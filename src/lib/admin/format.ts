const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** "2026-11-02" → "2 Nov 2026" (calendar date, no time zone shift). */
export function shortDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

export const shortDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
