import { describe, expect, it } from "vitest";
import { dueAction, lagosToday, nextOccasionAfter, occasionIn, sendDateFor } from "./reminders";

describe("reminder dates", () => {
  it("reminds a week before the date next year", () => {
    const next = nextOccasionAfter("2026-02-14", "2026-02-14", "2026-02-20");
    expect(next).toBe("2027-02-14");
    expect(sendDateFor(next)).toBe("2027-02-07");
  });

  it("crosses month and year boundaries", () => {
    expect(sendDateFor("2027-01-03")).toBe("2026-12-27");
    expect(sendDateFor("2027-03-05")).toBe("2027-02-26");
  });

  it("moves 29 February to the 28th in other years", () => {
    expect(occasionIn(2025, "2024-02-29")).toBe("2025-02-28");
    expect(occasionIn(2028, "2024-02-29")).toBe("2028-02-29");
  });

  it("never schedules a reminder in the past", () => {
    // Asked for long after the delivery date: the next one that's still ahead.
    expect(nextOccasionAfter("2024-05-01", "2024-05-01", "2026-04-28")).toBe("2027-05-01");
    expect(nextOccasionAfter("2024-05-01", "2024-05-01", "2026-04-24")).toBe("2026-05-01");
    // After sending this year's, next year's.
    expect(nextOccasionAfter("2024-05-01", "2026-05-01", "2026-04-24")).toBe("2027-05-01");
  });

  it("skips a reminder whose date has already gone by", () => {
    expect(dueAction("2026-05-01", "2026-04-25")).toBe("send");
    expect(dueAction("2026-05-01", "2026-05-01")).toBe("send");
    expect(dueAction("2026-05-01", "2026-05-02")).toBe("skip");
  });

  it("uses the Lagos date", () => {
    expect(lagosToday(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});
