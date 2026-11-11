import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog";
import type { StoredOrder } from "@/lib/orders";

/*
 * Customer uploads against the Firestore and Storage emulators (npm run test:emulator): the real upload
 * routes, a real resumable upload into the emulator's bucket, checkout's checks, linking on payment, and
 * the weekly clean-up. Stood in for: Paystack, emails.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const paystack = vi.hoisted(() => ({ verify: vi.fn(), start: vi.fn() }));
vi.mock("@/lib/server/paystack", async (original) => ({
  ...(await original<typeof import("@/lib/server/paystack")>()),
  verifyPayment: paystack.verify,
  startPayment: paystack.start,
}));
vi.mock("@/lib/server/order-emails", () => ({ sendPaidOrderEmails: vi.fn(async () => {}) }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));

const { db } = await import("@/lib/server/firebase");
const { confirmPayment, getOrder } = await import("@/lib/server/orders");
const uploads = await import("@/lib/server/uploads");
const startRoute = await import("@/app/api/uploads/route");
const progressRoute = await import("@/app/api/uploads/[id]/route");
const checkout = await import("@/app/api/checkout/route");

const SITE = "http://localhost";
const DETAILS = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "0803 123 4567",
  marketingOptIn: false,
  forSomeoneElse: false,
  recipientName: "",
  recipientPhone: "",
  zoneId: "lekki-phase-1",
  address: "12 Admiralty Way, Lekki Phase 1",
  landmark: "",
  deliveryDate: "2030-02-14",
  hidePrice: false,
};

let ip = 0;
const post = (url: string, body: unknown, headers: Record<string, string> = { origin: SITE }) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ip}`, ...headers },
    body: JSON.stringify(body),
  });

async function open(body: Record<string, unknown>, headers?: Record<string, string>) {
  const res = await startRoute.POST(post(`${SITE}/api/uploads`, body, headers));
  return { status: res.status, body: (await res.json()) as { id?: string; url?: string; message?: string } };
}

const photoBytes = (n: number) => new Uint8Array(n).map((_, i) => i % 251);

/** Opens and fully uploads a photo for the locket, as the browser does. */
async function uploadedPhoto(size = 1000): Promise<string> {
  const { status, body } = await open({ productId: "locket", kind: "photo", contentType: "image/jpeg", size });
  expect(status, body.message).toBe(200);
  const put = await fetch(body.url!, { method: "PUT", headers: { "Content-Range": `bytes 0-${size - 1}/${size}` }, body: photoBytes(size) });
  expect([200, 201]).toContain(put.status);
  return body.id!;
}

const locketLine = (uploadIds?: string[]) => ({
  productId: "locket",
  quantity: 1,
  customization: { kind: "photo", photoNames: ["us.jpg"], crop: { zoom: 1.2, x: 4, y: -3 }, ...(uploadIds ? { uploadIds } : {}) },
});

async function placeOrder(lines: unknown[]) {
  const res = await checkout.POST(post(`${SITE}/api/checkout`, { details: DETAILS, lines }, {}));
  return { status: res.status, body: (await res.json()) as { reference?: string; message?: string } };
}

async function pay(reference: string) {
  const order = (await getOrder(reference))!;
  paystack.verify.mockResolvedValueOnce({
    id: 7,
    reference,
    status: "success",
    amount: order.amountKobo,
    currency: "NGN",
    channel: "card",
    paidAt: "2026-11-11T10:00:00Z",
  });
  expect((await confirmPayment(reference)).outcome).toBe("paid-now");
}

beforeAll(async () => {
  const batch = db().batch();
  SEED_CATALOG.products.forEach((p, i) => batch.set(db().doc(`products/${p.id}`), { ...p, sortOrder: i }));
  SEED_CATALOG.zones.forEach((z, i) => batch.set(db().doc(`shippingZones/${z.id}`), { ...z, sortOrder: i }));
  batch.set(db().doc("settings/shop"), { craftingDays: 3 });
  await batch.commit();
});

beforeEach(() => {
  process.env.UPLOADS_ENABLED = "1";
  paystack.start.mockReset().mockResolvedValue({ authorizationUrl: "https://checkout.paystack.com/test" });
});

describe("opening an upload", () => {
  it("refuses other sites, and does nothing while uploads are off", async () => {
    expect((await open({ productId: "locket", kind: "photo", contentType: "image/jpeg", size: 10 }, { origin: "https://evil.example" })).status).toBe(403);
    process.env.UPLOADS_ENABLED = "";
    expect((await open({ productId: "locket", kind: "photo", contentType: "image/jpeg", size: 10 })).status).toBe(503);
  });

  it("only the kinds, types and sizes the product takes", async () => {
    expect((await open({ productId: "scroll", kind: "photo", contentType: "image/jpeg", size: 10 })).status).toBe(400);
    expect((await open({ productId: "locket", kind: "video", contentType: "video/mp4", size: 10 })).status).toBe(400);
    expect((await open({ productId: "locket", kind: "photo", contentType: "text/html", size: 10 })).status).toBe(400);
    expect((await open({ productId: "locket", kind: "photo", contentType: "image/jpeg", size: 16 * 1024 * 1024 })).status).toBe(400);
    expect((await open({ productId: "nfc-tag", kind: "video", contentType: "video/mp4", size: 101 * 1024 * 1024 })).status).toBe(400);
    expect((await open({ productId: "nfc-tag", kind: "video", contentType: "video/quicktime", size: 90 * 1024 * 1024 })).status).toBe(200);
  });

  it("carries on after a break: reports how much Google has", async () => {
    // The Storage emulator finishes an upload on any piece; real Google storage answers 308 with how much it
    // has, so that answer is stood in for here.
    const size = 256 * 1024 * 2 + 100;
    const { body } = await open({ productId: "polaroid", kind: "photo", contentType: "image/png", size });
    const realFetch = globalThis.fetch;
    const answers = [new Response(null, { status: 308 }), new Response(null, { status: 308, headers: { range: "bytes=0-262143" } }), new Response(null, { status: 200 })];
    const seen: RequestInit[] = [];
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url) !== body.url) return realFetch(url, init);
      seen.push(init!);
      return answers.shift()!;
    });
    try {
      const at = () => progressRoute.GET(new Request(`${SITE}/api/uploads/${body.id}`), { params: Promise.resolve({ id: body.id! }) }).then((r) => r.json());
      expect(await at()).toEqual({ received: 0, size, done: false });
      expect(await at()).toEqual({ received: 262144, size, done: false });
      expect(await at()).toEqual({ received: size, size, done: true });
      expect(seen[0]).toMatchObject({ method: "PUT", headers: { "Content-Range": `bytes */${size}` } });
    } finally {
      spy.mockRestore();
    }
    const bad = await progressRoute.GET(new Request(`${SITE}/api/uploads/nope`), { params: Promise.resolve({ id: "nope" }) });
    expect(bad.status).toBe(404);
  });
});

describe("checkout and payment", () => {
  it("takes an order with an uploaded photo and links the file to it once paid", async () => {
    const id = await uploadedPhoto();
    const placed = await placeOrder([locketLine([id])]);
    expect(placed.status, placed.body.message).toBe(200);
    expect((await db().doc(`uploads/${id}`).get()).get("orderNumber")).toBeNull();
    await pay(placed.body.reference!);
    expect((await db().doc(`uploads/${id}`).get()).get("orderNumber")).toBe(placed.body.reference);
    const order = (await getOrder(placed.body.reference!)) as StoredOrder;
    expect(order.lines[0].customization).toMatchObject({ kind: "photo", uploadIds: [id] });
    expect(await uploads.downloadLink(id, order.number)).toMatch(/^http/);

    // The same file can't go on a second order.
    expect((await placeOrder([locketLine([id])])).body.message).toMatch(/already on another order/);
  });

  it("refuses ids that aren't ours, aren't finished, or are for another product", async () => {
    expect((await placeOrder([locketLine(["0b6a1c5e-8f3e-4f6a-9d0b-1a2b3c4d5e6f"])])).body.message).toMatch(/couldn't find your photo/);
    expect((await placeOrder([locketLine(["not-a-uuid"])])).status).toBe(400);
    const { body } = await open({ productId: "locket", kind: "photo", contentType: "image/jpeg", size: 500 });
    expect((await placeOrder([locketLine([body.id!])])).body.message).toMatch(/didn't finish uploading/);
    const polaroidPhoto = (await open({ productId: "polaroid", kind: "photo", contentType: "image/jpeg", size: 10 })).body.id!;
    expect((await placeOrder([locketLine([polaroidPhoto])])).body.message).toMatch(/couldn't find your photo/);
  });

  it("still takes an order without the file, to be sent on WhatsApp", async () => {
    const placed = await placeOrder([locketLine()]);
    expect(placed.status, placed.body.message).toBe(200);
  });
});

describe("clean-up", () => {
  it("deletes week-old files no paid order uses, and keeps the rest", async () => {
    const unused = await uploadedPhoto();
    const recent = await uploadedPhoto();
    const kept = await uploadedPhoto();
    const placed = await placeOrder([locketLine([kept])]);
    await pay(placed.body.reference!);
    const old = new Date(Date.now() - 8 * 86_400_000).toISOString();
    await db().doc(`uploads/${unused}`).update({ createdAt: old });
    await db().doc(`uploads/${kept}`).update({ createdAt: old });

    expect(await uploads.deleteUnusedUploads()).toBeGreaterThanOrEqual(1);
    expect((await db().doc(`uploads/${unused}`).get()).exists).toBe(false);
    expect((await db().doc(`uploads/${recent}`).get()).exists).toBe(true);
    expect((await db().doc(`uploads/${kept}`).get()).exists).toBe(true);
    const bucket = await (await import("@/lib/server/firebase")).storageBucket();
    expect((await bucket.file(`uploads/${unused}`).exists())[0]).toBe(false);
    expect((await bucket.file(`uploads/${kept}`).exists())[0]).toBe(true);
  });
});
