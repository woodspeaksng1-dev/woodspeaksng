import { describe, expect, it } from "vitest";
import { broadcastInput, renderBroadcast } from "./broadcast";

const base = { subject: "Valentine's is close", heading: "", body: "Order by the 7th.\n\nWe deliver across Lagos.", buttonLabel: "", buttonUrl: "" };

describe("broadcast emails", () => {
  it("accepts site paths and https links for the button, and nothing else", () => {
    expect(broadcastInput.safeParse({ ...base, buttonLabel: "Shop", buttonUrl: "/shop" }).success).toBe(true);
    expect(broadcastInput.safeParse({ ...base, buttonLabel: "Shop", buttonUrl: "https://instagram.com/woodspeaks" }).success).toBe(true);
    for (const bad of ["javascript:alert(1)", "http://x.test", "//evil.test", "/\\evil.test", "data:text/html,hi"])
      expect(broadcastInput.safeParse({ ...base, buttonLabel: "Shop", buttonUrl: bad }).success).toBe(false);
  });

  it("needs a button's words and link together", () => {
    expect(broadcastInput.safeParse({ ...base, buttonLabel: "Shop" }).success).toBe(false);
    expect(broadcastInput.safeParse({ ...base, buttonUrl: "/shop" }).success).toBe(false);
  });

  it("escapes everything typed, makes paragraphs, and always has an unsubscribe link", () => {
    const c = broadcastInput.parse({ ...base, heading: "<b>Hi</b>", body: "One & two\n\n<script>x</script>", buttonLabel: "Shop", buttonUrl: "/shop" });
    const { html, text } = renderBroadcast(c, { siteUrl: "https://woodspeaks.test", unsubscribeUrl: "https://woodspeaks.test/u?t=abc" });
    expect(html).toContain("&lt;b&gt;Hi&lt;/b&gt;");
    expect(html).not.toContain("<script>");
    expect(html.match(/<p style="font-size:16px/g)).toHaveLength(2);
    expect(html).toContain('href="https://woodspeaks.test/shop"');
    expect(html).toContain('href="https://woodspeaks.test/u?t=abc"');
    expect(text).toContain("Unsubscribe: https://woodspeaks.test/u?t=abc");
  });
});
