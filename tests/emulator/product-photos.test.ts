import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog";
import type { Product } from "@/lib/types";

/*
 * Product photos uploaded in admin, against the Firestore and Storage emulators: the real upload route,
 * storage, the product record and the public photo address. Stood in for: who is signed in, and Next's
 * cache refresh.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const STAFF = { uid: "u1", email: "staff@woodspeaks.ng", role: "staff" as const, name: "Staff" };
const session = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@/lib/server/staff", async (original) => ({
  ...(await original<typeof import("@/lib/server/staff")>()),
  requireStaffRequest: async () =>
    session.signedIn ? { ok: true, staff: STAFF } : { ok: false, response: Response.json({ message: "Sign in again." }, { status: 401 }) },
}));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: cache.revalidateTag, updateTag: vi.fn(), cacheLife: () => {}, cacheTag: () => {} }));

const { db } = await import("@/lib/server/firebase");
const upload = await import("@/app/api/admin/products/[id]/photo/route");
const more = await import("@/app/api/admin/products/[id]/photos/route");
const serve = await import("@/app/catalog-photo/[file]/route");

const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(60).fill(1)]);

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (id: string, body: Uint8Array<ArrayBuffer>) =>
  upload.POST(new Request(`http://localhost/api/admin/products/${id}/photo`, { method: "POST", headers: { origin: "http://localhost" }, body }), ctx(id));
const remove = (id: string) => upload.DELETE(new Request(`http://localhost/api/admin/products/${id}/photo`, { method: "DELETE", headers: { origin: "http://localhost" } }), ctx(id));
const get = (path: string) => {
  const file = path.split("/").pop()!;
  return serve.GET(new Request(`http://localhost${path}`), { params: Promise.resolve({ file }) });
};
const addMore = (id: string, body: Uint8Array<ArrayBuffer>) =>
  more.POST(new Request(`http://localhost/api/admin/products/${id}/photos`, { method: "POST", headers: { origin: "http://localhost" }, body }), ctx(id));
const arrange = (id: string, image: string, move: string) =>
  more.PATCH(
    new Request(`http://localhost/api/admin/products/${id}/photos`, {
      method: "PATCH",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ image, move }),
    }),
    ctx(id),
  );
const photosOf = async (id: string) => {
  const p = (await db().doc(`products/${id}`).get()).data() as Product;
  return { main: p.image, gallery: p.gallery ?? [] };
};
const imageOf = async (id: string) => ((await db().doc(`products/${id}`).get()).data() as Product).image;

beforeAll(async () => {
  const batch = db().batch();
  SEED_CATALOG.products.forEach((p, i) => batch.set(db().doc(`products/${p.id}`), { ...p, sortOrder: i }));
  await batch.commit();
});

beforeEach(() => {
  session.signedIn = true;
  cache.revalidateTag.mockClear();
});

describe("product photos", () => {
  it("only staff can upload", async () => {
    session.signedIn = false;
    expect((await post("journal", PNG)).status).toBe(401);
  });

  it("refuses files that aren't photos, whatever they claim to be", async () => {
    const res = await post("journal", new TextEncoder().encode("<html><script>alert(1)</script></html>"));
    expect(res.status).toBe(400);
    expect(await imageOf("journal")).toBeUndefined();
  });

  it("refuses products that don't exist", async () => {
    expect((await post("no-such-thing", PNG)).status).toBe(400);
    expect((await post("../evil", PNG)).status).toBe(404);
  });

  it("saves a photo, serves it with a long cache, and refreshes the shop", async () => {
    const res = await post("journal", PNG);
    const body = (await res.json()) as { image: string };
    expect(res.status).toBe(200);
    expect(body.image).toMatch(/^\/catalog-photo\/journal-[0-9a-f-]{36}\.png$/);
    expect(await imageOf("journal")).toBe(body.image);
    expect(cache.revalidateTag).toHaveBeenCalled();

    const photo = await get(body.image);
    expect(photo.status).toBe(200);
    expect(photo.headers.get("content-type")).toBe("image/png");
    expect(photo.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await photo.arrayBuffer())).toEqual(PNG);
  });

  it("replacing a photo deletes the old one; removing takes it off the product", async () => {
    const first = ((await (await post("cake", PNG)).json()) as { image: string }).image;
    const second = ((await (await post("cake", JPEG)).json()) as { image: string }).image;
    expect(second).toMatch(/\.jpg$/);
    expect((await get(first)).status).toBe(404);
    expect((await get(second)).status).toBe(200);

    expect((await remove("cake")).status).toBe(200);
    expect(await imageOf("cake")).toBeUndefined();
    expect((await get(second)).status).toBe(404);
  });

  it("serves only files it stored", async () => {
    expect((await get("/catalog-photo/..%2Fuploads%2Fsecret")).status).toBe(404);
    expect((await get("/catalog-photo/journal-00000000-0000-0000-0000-000000000000.png")).status).toBe(404);
  });
});

describe("more photos per product", () => {
  const addTo = async (id: string) => ((await (await addMore(id, PNG)).json()) as { image: string }).image;

  it("the first becomes the main photo, then they line up after it, up to six", async () => {
    const main = await addTo("polaroid");
    expect(await photosOf("polaroid")).toEqual({ main, gallery: [] });
    const extras = [];
    for (let i = 0; i < 6; i++) extras.push(await addTo("polaroid"));
    expect(await photosOf("polaroid")).toEqual({ main, gallery: extras });
    const res = await addMore("polaroid", PNG);
    expect(res.status).toBe(400);
    expect((await photosOf("polaroid")).gallery).toHaveLength(6);
    expect(cache.revalidateTag).toHaveBeenCalled();
  });

  it("moves, makes main (keeping the old main), and removes, deleting the file", async () => {
    const main = await addTo("locket");
    const [a, b] = [await addTo("locket"), await addTo("locket")];

    expect((await arrange("locket", a, "up")).status).toBe(400); // already first
    expect((await arrange("locket", a, "down")).status).toBe(200);
    expect((await photosOf("locket")).gallery).toEqual([b, a]);

    expect((await arrange("locket", a, "main")).status).toBe(200);
    expect(await photosOf("locket")).toEqual({ main: a, gallery: [b, main] });

    expect((await arrange("locket", b, "remove")).status).toBe(200);
    expect((await photosOf("locket")).gallery).toEqual([main]);
    expect((await get(b)).status).toBe(404);
    expect((await get(main)).status).toBe(200);
  });

  it("removing the main photo moves the next one up", async () => {
    const main = await addTo("rose");
    const next = await addTo("rose");
    expect((await remove("rose")).status).toBe(200);
    expect(await photosOf("rose")).toEqual({ main: next, gallery: [] });
    expect((await get(main)).status).toBe(404);
  });

  it("refuses photos that aren't on the product, made-up moves, and signed-out calls", async () => {
    await addTo("bouquet"); // the main photo
    const mine = await addTo("bouquet");
    const other = await addTo("scroll");
    expect((await arrange("bouquet", other, "remove")).status).toBe(400);
    expect((await arrange("bouquet", mine, "explode")).status).toBe(400);
    expect((await arrange("bouquet", "https://evil.example/x.png", "main")).status).toBe(400);
    expect((await addMore("bouquet", new TextEncoder().encode("<svg onload=alert(1)>"))).status).toBe(400);
    session.signedIn = false;
    expect((await arrange("bouquet", mine, "remove")).status).toBe(401);
    expect((await get(other)).status).toBe(200);
  });
});
