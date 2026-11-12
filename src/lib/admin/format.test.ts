import { describe, expect, it } from "vitest";
import { parseAmount } from "./format";

describe("parseAmount", () => {
  it("reads prices the way people type them", () => {
    for (const typed of ["17000", "17,000", "₦17,000", "₦ 17,000", "N17,000", "NGN 17000", "17 000", " 17000 "]) expect(parseAmount(typed)).toBe(17000);
  });
  it("keeps decimals for the server to refuse", () => {
    expect(parseAmount("17000.50")).toBe(17000.5);
  });
  it("gives NaN for empty or non-numbers", () => {
    for (const typed of ["", "  ", "abc", "17k", "-5", "1,7a"]) expect(parseAmount(typed)).toBeNaN();
  });
});
