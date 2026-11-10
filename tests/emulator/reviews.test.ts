import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog";
import type { StoredOrder } from "@/lib/orders";
import { SEED_REVIEWS } from "@/lib/reviews";

/*
 * Reviews against the Firestore emulator (npm run test:emulator): the real admin actions and the shop's read.
 * Stood in for: who is signed in, and Next's cache refresh.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const session = vi.hoisted(() => ({ staff: null as null | { uid: string; email: string; role: "owner" | "staff"; name: string | null } }));
vi.mock("@/lib/server/admin-session", () => ({ currentStaff: async () => session.staff, requireStaff: async () => session.staff }));
const cache = vi.hoisted(() => ({ updateTag: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: cache.updateTag, cacheLife: () => {}, cacheTag: () => {} }));

const { db } = await import("@/lib/server/firebase");
const { readReviews, getPublicReviews } = await import("@/lib/server/reviews");
const actions = await import("@/app/admin/(panel)/reviews/actions");

const STAFF = { uid: "s1", email: "tolu@woodspeaks.test", role: "staff" as const, name: "Tolu" };

const form = (over: Record<string, unknown> = {}) => ({
  quote: "The scroll made my wife cry happy tears. Beautiful work.",
  who: "Segun A.",
  productId: "scroll",
  role: "",
  rating: "",
  orderNumber: "",
  source: "instagram",
  visible: true,
  consent: true,
  ...over,
});

function order(number: string, status: StoredOrder["status"], productId: string): StoredOrder {
  return {
    number,
    status,
    createdAt: "2026-10-01T10:00:00Z",
    paidAt: status === "pending" ? null : "2026-10-01T10:00:00Z",
    customer: { name: "Segun Ade", email: "segun@example.com", phone: "08031112222", marketingOptIn: false },
    recipient: null,
    delivery: { zoneId: "yaba", zoneName: "Yaba", address: "1 Test Road", landmark: "", date: "2026-10-05", hidePrice: false },
    lines: [{ productId, name: productId, unitPrice: 10000, quantity: 1, lineTotal: 10000, customization: { kind: "none" } }],
    itemsTotal: 10000,
    deliveryFee: 5000,
    total: 15000,
    amountKobo: 1_500_000,
    currency: "NGN",
    nfc: null,
    paystack: null,
    paymentProblem: null,
  };
}

beforeAll(async () => {
  const batch = db().batch();
  SEED_CATALOG.products.forEach((p, i) => batch.set(db().doc(`products/${p.id}`), { ...p, sortOrder: i }));
  SEED_CATALOG.zones.forEach((z, i) => batch.set(db().doc(`shippingZones/${z.id}`), { ...z, sortOrder: i }));
  batch.set(db().doc("settings/shop"), { craftingDays: 3 });
  batch.set(db().doc("orders/WS-REVIEW0001"), order("WS-REVIEW0001", "delivered", "scroll"));
  batch.set(db().doc("orders/WS-REVIEW0002"), order("WS-REVIEW0002", "pending", "scroll"));
  await batch.commit();
});

beforeEach(async () => {
  session.staff = STAFF;
  cache.updateTag.mockClear();
  const snap = await db().collection("reviews").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
  const batch = db().batch();
  SEED_REVIEWS.forEach((r) => batch.set(db().doc(`reviews/${r.id}`), r));
  await batch.commit();
});

describe("adding reviews", () => {
  it("adds one at the end, shows it, refreshes the shop and logs who did it", async () => {
    expect((await actions.createReview(form())).ok).toBe(true);
    const all = await readReviews();
    expect(all).toHaveLength(7);
    expect(all.at(-1)).toMatchObject({ who: "Segun A.", productId: "scroll", rating: null, verified: false, visible: true });
    expect((await getPublicReviews()).at(-1)?.who).toBe("Segun A.");
    expect(cache.updateTag).toHaveBeenCalledWith("reviews");
    const log = await db().collection("auditLog").where("action", "==", "Added review").get();
    expect(log.docs.some((d) => d.get("by") === STAFF.email)).toBe(true);
  });

  it("needs the customer's consent, real words, and a real product", async () => {
    expect((await actions.createReview(form({ consent: false }))).message).toMatch(/agreed/);
    expect((await actions.createReview(form({ quote: "ok" }))).ok).toBe(false);
    expect((await actions.createReview(form({ productId: "unicorn" }))).ok).toBe(false);
    expect((await actions.createReview(form({ rating: "7" }))).ok).toBe(false);
    expect(await readReviews()).toHaveLength(6);
    expect(cache.updateTag).not.toHaveBeenCalled();
  });

  it("marks it verified only for a paid order that included the product", async () => {
    expect((await actions.createReview(form({ orderNumber: "ws-review0002" }))).message).toMatch(/no paid order/);
    expect((await actions.createReview(form({ orderNumber: "WS-REVIEW0001", productId: "locket" }))).message).toMatch(/didn't include/);
    expect((await actions.createReview(form({ orderNumber: "ws-review0001", rating: "5" }))).ok).toBe(true);
    expect((await readReviews()).at(-1)).toMatchObject({ orderNumber: "WS-REVIEW0001", verified: true, rating: 5 });
  });

  it("does nothing when signed out", async () => {
    session.staff = null;
    expect((await actions.createReview(form())).message).toMatch(/Sign in/);
    expect((await actions.removeReview("old-site-1")).ok).toBe(false);
    expect(await readReviews()).toHaveLength(6);
  });
});

describe("managing reviews", () => {
  it("hidden reviews stay in admin but leave the shop", async () => {
    expect((await actions.showReview("old-site-2", false)).ok).toBe(true);
    expect((await getPublicReviews()).map((r) => r.id)).not.toContain("old-site-2");
    expect((await readReviews()).map((r) => r.id)).toContain("old-site-2");
  });

  it("edits keep its place; delete removes it", async () => {
    expect((await actions.saveReview("old-site-3", form({ who: "Jackson D.", productId: "locket", source: "old-site" }))).ok).toBe(true);
    const all = await readReviews();
    expect(all[2]).toMatchObject({ id: "old-site-3", quote: form().quote });
    expect((await actions.removeReview("old-site-3")).ok).toBe(true);
    expect((await readReviews()).map((r) => r.id)).not.toContain("old-site-3");
    expect((await actions.saveReview("old-site-3", form())).ok).toBe(false);
  });

  it("moves up and down, and not past the ends", async () => {
    expect((await actions.reorderReview("old-site-3", "up")).ok).toBe(true);
    expect((await readReviews()).map((r) => r.id).slice(0, 3)).toEqual(["old-site-1", "old-site-3", "old-site-2"]);
    expect((await actions.reorderReview("old-site-1", "up")).ok).toBe(false);
    expect((await actions.reorderReview("old-site-6", "down")).ok).toBe(false);
    expect((await actions.reorderReview("old-site-1", "down")).ok).toBe(true);
    expect((await readReviews())[0].id).toBe("old-site-3");
  });

  it("refuses made-up ids", async () => {
    expect((await actions.showReview("../orders/x", true)).ok).toBe(false);
    expect((await actions.removeReview("no-such-review")).ok).toBe(false);
  });
});
