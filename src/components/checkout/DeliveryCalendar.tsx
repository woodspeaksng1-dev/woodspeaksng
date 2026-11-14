"use client";

import { useState } from "react";
import { isSunday } from "@/lib/checkout";

/*
 * Checkout's delivery date picker: a month at a time, weeks starting Monday. Days before the area's earliest
 * date, after the latest bookable date, and every Sunday (no dispatch) are greyed out and can't be chosen.
 * A phone's own date picker can't grey out Sundays, hence this. Dates are YYYY-MM-DD (Lagos calendar).
 */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthOf = (date: string) => ({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) - 1 });
const monthName = (y: number, m: number) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m, 1));
const dayName = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

export function DeliveryCalendar({
  id,
  value,
  onChange,
  earliest,
  latest,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (date: string) => void;
  earliest: string;
  latest: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [shown, setShown] = useState(() => monthOf(value && value >= earliest ? value : earliest));
  const { y, m } = shown;
  const first = monthOf(earliest);
  const last = monthOf(latest);
  const canGoBack = y > first.y || (y === first.y && m > first.m);
  const canGoOn = y < last.y || (y === last.y && m < last.m);
  const move = (by: number) => setShown(({ y, m }) => ({ y: y + Math.floor((m + by) / 12), m: (((m + by) % 12) + 12) % 12 }));

  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // blanks before the 1st, weeks starting Monday
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => iso(y, m, i + 1))];

  const nav = "grid h-10 w-10 place-items-center rounded-full text-xl text-ink transition-colors hover:bg-sand disabled:opacity-25 disabled:hover:bg-transparent";
  return (
    <div
      id={id}
      role="group"
      aria-describedby={describedBy}
      className={`mt-1.5 rounded-xl border bg-vellum p-3 ${invalid ? "border-oxblood" : "border-rule"}`}
    >
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={!canGoBack} className={nav} aria-label="Previous month">
          ‹
        </button>
        <p className="font-display text-lg text-ink" aria-live="polite">
          {monthName(y, m)}
        </p>
        <button type="button" onClick={() => move(1)} disabled={!canGoOn} className={nav} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} aria-hidden className={`pb-1 text-xs ${d === "Sun" ? "text-ink/30" : "text-ink-soft"}`}>
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const sunday = isSunday(date);
          const off = sunday || date < earliest || date > latest;
          const chosen = date === value;
          return (
            <button
              key={date}
              type="button"
              disabled={off}
              onClick={() => onChange(date)}
              aria-pressed={chosen}
              aria-label={`${dayName(date)}${sunday ? ", no Sunday deliveries" : off ? ", not available" : ""}`}
              className={`aspect-square rounded-full text-sm tabular-nums transition-colors ${
                chosen ? "bg-oxblood text-vellum" : off ? "cursor-not-allowed text-ink/25" : "text-ink hover:bg-sand"
              } ${sunday && !chosen ? "line-through decoration-ink/20" : ""}`}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
