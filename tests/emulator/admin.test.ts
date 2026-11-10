import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog";
import type { StoredOrder } from "@/lib/orders";

/*
 * Admin changes against the Firestore emulator (npm run test:emulator): the real server actions and the
 * functions behind them. Stood in for: who is signed in, the dispatched email, and Next's cache refresh.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const session = vi.hoisted(() => ({ staff: null as null | { uid: string; email: string; role: "owner" | "staff"; name: string | null } }));
vi.mock("@/lib/server/admin-session", () => ({ currentStaff: async () => session.staff, requireStaff: async () => session.staff }));
const mocks = vi.hoisted(() => ({ dispatched: vi.fn(async () => {}), updateTag: vi.fn() }));
vi.mock("@/lib/server/order-emails", () => ({ sendDispatchedEmail: mocks.dispatched, sendPaidOrderEmails: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag, cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));

const { db } = await import("@/lib/server/firebase");
const { readCatalog } = await import("@/lib/server/catalog");
const { loadOrder, advanceOrder } = await import("@/lib/server/admin-orders");
const orderActions = await import("@/app/admin/(panel)/orders/actions");
const catalogActions = await import("@/app/admin/(panel)/catalog-actions");

const STAFF = { uid: "u1", email: "staff@woodspeaks.test", role: "staff" as const, name: "Tolu" };

let n = 0;
async function makeOrder(overrides: Partial<StoredOrder> = {}): Promise<string> {
  const number = `WS-TEST${String(++n).padStart(5, "0")}`;
  const order: StoredOrder = {
    number,
    status: "paid",
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    customer: { name: "Ada Obi", email: "ada@example.com", phone: "08031234567", marketingOptIn: false },
    recipient: null,
    delivery: { zoneId: "yaba", zoneName: "Yaba", address: "12 Herbert Macaulay Way", landmark: "", date: "2030-02-14", hidePrice: false },
    lines: [{ productId: "pocket-watch", name: "Pocket Watch", unitPrice: 15000, quantity: 1, lineTotal: 15000, customization: { kind: "none" } }],
    itemsTotal: 15000,
    deliveryFee: 5000,
    total: 20000,
    amountKobo: 2_000_000,
    currency: "NGN",
    nfc: null,
    paystack: { transactionId: 1, channel: "card", paidAt: null },
    paymentProblem: null,
    ...overrides,
  };
  await db().doc(`orders/${number}`).set(order);
  return number;
}

beforeAll(async () => {
  const batch = db().batch();
  SEED_CATALOG.products.forEach((p, i) => batch.set(db().doc(`products/${p.id}`), { ...p, sortOrder: i, hidden: false }));
  SEED_CATALOG.zones.forEach((z, i) => batch.set(db().doc(`shippingZones/${z.id}`), { ...z, sortOrder: i }));
  batch.set(db().doc("settings/shop"), { craftingDays: 3 });
  await batch.commit();
});

beforeEach(() => {
  session.staff = STAFF;
  mocks.dispatched.mockClear();
  mocks.updateTag.mockClear();
});

describe("moving orders on", () => {
  it("goes paid → crafting → dispatched → delivered, emailing the buyer only on dispatch", async () => {
    const number = await makeOrder();
    expect((await orderActions.moveOrderOn(number, "crafting")).ok).toBe(true);
    expect(mocks.dispatched).not.toHaveBeenCalled();
    expect((await orderActions.moveOrderOn(number, "dispatched")).message).toMatch(/emailed/);
    expect(mocks.dispatched).toHaveBeenCalledTimes(1);
    expect((await orderActions.moveOrderOn(number, "delivered")).ok).toBe(true);
    expect((await loadOrder(number))!.status).toBe("delivered");
  });

  it("won't skip a step, go backwards, or touch an unpaid order", async () => {
    const number = await makeOrder();
    expect((await orderActions.moveOrderOn(number, "delivered")).ok).toBe(false);
    const unpaid = await makeOrder({ status: "pending", paidAt: null });
    expect((await orderActions.moveOrderOn(unpaid, "crafting")).ok).toBe(false);
    expect((await loadOrder(unpaid))!.status).toBe("pending");
  });

  it("refuses a stale page: two staff clicking the same step, one wins", async () => {
    const number = await makeOrder();
    const results = await Promise.all([advanceOrder(STAFF, number, "crafting"), advanceOrder(STAFF, number, "crafting")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("won't dispatch an NFC order until the tag is written", async () => {
    const number = await makeOrder({ status: "crafting", nfc: { status: "to-write" } });
    expect((await orderActions.moveOrderOn(number, "dispatched")).message).toMatch(/NFC/);
    expect(mocks.dispatched).not.toHaveBeenCalled();
    expect((await orderActions.nfcWritten(number)).ok).toBe(true);
    expect((await orderActions.moveOrderOn(number, "dispatched")).ok).toBe(true);
  });

  it("logs who moved it", async () => {
    const number = await makeOrder();
    await orderActions.moveOrderOn(number, "crafting");
    const log = await db().collection("auditLog").where("target", "==", number).get();
    expect(log.docs.map((d) => d.get("by"))).toContain(STAFF.email);
  });

  it("does nothing when signed out, or with a made-up status", async () => {
    const number = await makeOrder();
    session.staff = null;
    expect((await orderActions.moveOrderOn(number, "crafting")).message).toMatch(/Sign in/);
    session.staff = STAFF;
    expect((await orderActions.moveOrderOn(number, "refunded")).ok).toBe(false);
    expect((await orderActions.moveOrderOn("../../etc", "crafting")).ok).toBe(false);
    expect((await loadOrder(number))!.status).toBe("paid");
  });
});

describe("editing products", () => {
  const edit = async (id: string, change: Record<string, unknown> = {}) => {
    const p = (await readCatalog()).products.find((x) => x.id === id)!;
    return catalogActions.saveProduct(id, {
      name: p.name,
      price: p.price,
      description: p.description,
      dimensions: p.dimensions ?? "",
      included: p.included ?? "",
      occasions: p.occasions,
      recipients: p.recipients,
      personalization: p.personalization,
      featured: !!p.featured,
      hidden: !!p.hidden,
      addOn: !!p.addOn,
      perishable: !!p.perishable,
      seoTitle: p.seoTitle ?? "",
      imageAlt: p.imageAlt ?? "",
      ...change,
    });
  };

  it("saves a new price, logs it and refreshes the shop", async () => {
    expect((await edit("journal", { price: 16000 })).ok).toBe(true);
    expect((await readCatalog()).products.find((p) => p.id === "journal")!.price).toBe(16000);
    expect(mocks.updateTag).toHaveBeenCalledWith("catalog");
    const log = await db().collection("auditLog").where("action", "==", "edited Journal:").get();
    expect(log.docs.some((d) => String(d.get("target")).includes("₦16,000"))).toBe(true);
  });

  it("refuses bad values and leaves the shop alone", async () => {
    for (const change of [{ price: 0 }, { price: 1.5 }, { price: "15000" }, { name: "" }, { description: "x".repeat(601) }, { occasions: ["halloween"] }]) {
      expect((await edit("journal", change)).ok).toBe(false);
    }
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("won't change the kind of personalisation", async () => {
    expect((await edit("scroll", { personalization: { kind: "none" } })).ok).toBe(false);
  });

  it("keeps the home page to 6 featured products", async () => {
    const products = (await readCatalog()).products;
    for (const p of products.filter((p) => !p.featured).slice(0, 6)) await edit(p.id, { featured: true });
    const featured = (await readCatalog()).products.filter((p) => p.featured).length;
    expect(featured).toBe(6);
  });

  it("does nothing when signed out", async () => {
    session.staff = null;
    expect((await edit("journal", { price: 1 })).message).toMatch(/Sign in/);
    expect((await readCatalog()).products.find((p) => p.id === "journal")!.price).not.toBe(1);
  });
});

describe("delivery", () => {
  it("changes a fee, which pricing then uses", async () => {
    expect((await catalogActions.saveZone("yaba", { name: "Yaba", fee: 5500, estimate: "Same day", perishables: true })).ok).toBe(true);
    expect((await readCatalog()).zones.find((z) => z.id === "yaba")).toMatchObject({ fee: 5500, estimate: "Same day" });
  });

  it("adds and removes an area, refusing duplicates", async () => {
    expect((await catalogActions.createZone({ name: "Surulere", fee: 4500, estimate: "", perishables: true })).ok).toBe(true);
    expect((await catalogActions.createZone({ name: "Surulere", fee: 4500, estimate: "", perishables: true })).ok).toBe(false);
    expect((await readCatalog()).zones.some((z) => z.id === "surulere")).toBe(true);
    expect((await catalogActions.deleteZone("surulere")).ok).toBe(true);
    expect((await readCatalog()).zones.some((z) => z.id === "surulere")).toBe(false);
  });

  it("refuses negative or missing fees", async () => {
    for (const fee of [-1, Number.NaN, 2.5]) expect((await catalogActions.saveZone("yaba", { name: "Yaba", fee, estimate: "", perishables: true })).ok).toBe(false);
  });

  it("sets crafting time between 0 and 30 days", async () => {
    expect((await catalogActions.saveCraftingDays(4)).ok).toBe(true);
    expect((await readCatalog()).craftingDays).toBe(4);
    for (const days of [-1, 31, 2.5, "3"]) expect((await catalogActions.saveCraftingDays(days)).ok).toBe(false);
  });
});
