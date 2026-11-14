import { describe, expect, it } from "vitest";
import { checkoutSchema, deliveryDateProblem, earliestDelivery, lagosToday } from "./checkout";
import { letterSchema } from "./validation";

const LEAD = { lagos: 1, outside: 3 };
const LAGOS = { outsideLagos: false };
const OUTSIDE = { outsideLagos: true };
// Wednesday 18 Nov 2026, 10:00 in Lagos.
const WED = new Date("2026-11-18T09:00:00Z");

describe("delivery dates", () => {
  it("uses the Lagos calendar, whatever the server's clock zone", () => {
    expect(lagosToday(new Date("2026-11-18T23:30:00Z"))).toBe("2026-11-19"); // 00:30 Thursday in Lagos
    expect(lagosToday(new Date("2026-11-18T22:30:00Z"))).toBe("2026-11-18");
  });

  it("Lagos from the next day, outside Lagos from 3 days", () => {
    expect(earliestDelivery(LEAD.lagos, WED)).toBe("2026-11-19");
    expect(earliestDelivery(LEAD.outside, WED)).toBe("2026-11-21");
    expect(deliveryDateProblem("2026-11-19", LAGOS, LEAD, WED)).toBeNull();
    expect(deliveryDateProblem("2026-11-18", LAGOS, LEAD, WED)).toMatch(/earliest/);
    expect(deliveryDateProblem("2026-11-20", OUTSIDE, LEAD, WED)).toMatch(/Outside Lagos/);
    expect(deliveryDateProblem("2026-11-21", OUTSIDE, LEAD, WED)).toBeNull();
  });

  it("never on a Sunday: an earliest date that lands on one moves to Monday", () => {
    expect(deliveryDateProblem("2026-11-22", LAGOS, LEAD, WED)).toMatch(/Sundays/);
    const sat = new Date("2026-11-21T09:00:00Z");
    expect(earliestDelivery(LEAD.lagos, sat)).toBe("2026-11-23");
    const thu = new Date("2026-11-19T09:00:00Z");
    expect(earliestDelivery(LEAD.outside, thu)).toBe("2026-11-23");
  });

  it("not more than six months ahead", () => {
    expect(deliveryDateProblem("2027-06-01", LAGOS, LEAD, WED)).toMatch(/six months/);
  });

  it("checkout refuses a Sunday and a too-early date for an outside area", () => {
    const zones = [
      { id: "ikeja", name: "Ikeja", fee: 3000, estimate: null, perishables: true },
      { id: "ibadan", name: "Ibadan", fee: 9000, estimate: null, perishables: false, outsideLagos: true },
    ];
    const schema = checkoutSchema({ zones, leadDays: LEAD });
    const base = {
      name: "Ada Obi",
      email: "ada@example.com",
      phone: "08031234567",
      marketingOptIn: false,
      forSomeoneElse: false,
      recipientName: "",
      recipientPhone: "",
      address: "12 Allen Avenue, Ikeja",
      landmark: "",
      hidePrice: false,
    };
    const tomorrow = earliestDelivery(1);
    const dateError = (zoneId: string, deliveryDate: string) =>
      schema.safeParse({ ...base, zoneId, deliveryDate }).error?.issues.find((i) => i.path[0] === "deliveryDate")?.message;
    expect(dateError("ikeja", tomorrow)).toBeUndefined();
    expect(dateError("ibadan", tomorrow)).toMatch(/Outside Lagos/);
    expect(dateError("ibadan", earliestDelivery(3))).toBeUndefined();
    expect(dateError("ikeja", "2030-02-17")).toMatch(/Sundays/); // a Sunday
  });
});

describe("letter text", () => {
  const letter = letterSchema(300);
  it("takes what customers really type: curly quotes, ellipses, emoji, symbols", () => {
    const text =
      "I have been thinking about how to put this into words and honestly it’s still a struggle…\n\nYou were so happy . " +
      "(well except my sign out)…“Bella & Michele ” — will you do me the honour, Mary? ❤️😊 <3 > 100% #1 *always* ₦";
    expect(letter.safeParse(text).success).toBe(true);
  });
  it("refuses only hidden control characters", () => {
    expect(letter.safeParse("Hello\u0000there").success).toBe(false);
    expect(letter.safeParse("Hello ‮ereht").success).toBe(false);
    expect(letter.safeParse("Line one\r\n\tLine two").success).toBe(true);
  });
});
