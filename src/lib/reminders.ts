/*
 * "Remind me next year": dates for the yearly reminder email. The occasion is the order's delivery date;
 * the email goes out a week before that date comes round again, every year until the buyer stops it.
 * Dates are calendar dates (YYYY-MM-DD), compared as strings, in Lagos time.
 */

export const DAYS_BEFORE = 7;

export interface ReminderRow {
  orderNumber: string;
  deliverTo: string;
  items: string;
  nextOccasion: string | null;
  nextSendOn: string | null;
  lastSentAt: string | null;
}

/** Today's date in Lagos. */
export const lagosToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The occasion's day and month in a given year. 29 February becomes 28 February in other years. */
export function occasionIn(year: number, occasion: string): string {
  const [, m, d] = occasion.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return iso(new Date(Date.UTC(year, m - 1, Math.min(d, last))));
}

export function sendDateFor(occasionDate: string): string {
  const [y, m, d] = occasionDate.split("-").map(Number);
  return iso(new Date(Date.UTC(y, m - 1, d - DAYS_BEFORE)));
}

/** The first occasion after the original one whose reminder hasn't already passed (today or later). */
export function nextOccasionAfter(occasion: string, after: string, today: string): string {
  let year = Number(after.slice(0, 4)) + 1;
  while (occasionIn(year, occasion) <= after || sendDateFor(occasionIn(year, occasion)) < today) year++;
  return occasionIn(year, occasion);
}

/** What the daily job does with a due reminder: send it, or (if the occasion has already gone by) skip to next year. */
export const dueAction = (nextOccasion: string, today: string): "send" | "skip" => (today > nextOccasion ? "skip" : "send");
