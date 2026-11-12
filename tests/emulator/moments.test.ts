import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog";
import { BUILT_IN_MOMENTS, type Moment } from "@/lib/gallery";

/*
 * Customer moments against the Firestore and Storage emulators (npm run test:emulator): the real add route,
 * the admin actions, the stored photo and the shop's read. Stood in for: who is signed in, and Next's cache.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const STAFF = { uid: "s1", email: "tolu@woodspeaks.test", role: "staff" as const, name: "Tolu" };
const session = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@/lib/server/staff", async (original) => ({
  ...(await original<typeof import("@/lib/server/staff")>()),
  requireStaffRequest: async () =>
    session.signedIn ? { ok: true, staff: STAFF } : { ok: false, response: Response.json({ message: "Sign in again." }, { status: 401 }) },
}));
vi.mock("@/lib/server/admin-session", () => ({ currentStaff: async () => (session.signedIn ? STAFF : null), requireStaff: async () => STAFF }));
const cache = vi.hoisted(() => ({ updateTag: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: cache.updateTag, revalidateTag: cache.revalidateTag, cacheLife: () => {}, cacheTag: () => {} }));

const { db } = await import("@/lib/server/firebase");
const { readMoments, getPublicMoments } = await import("@/lib/server/moments");
const route = await import("@/app/api/admin/moments/route");
const actions = await import("@/app/admin/(panel)/moments/actions");
const serve = await import("@/app/catalog-photo/[file]/route");

const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

function add(fields: Record<string, string> = {}, photo: Uint8Array<ArrayBuffer> | null = PNG) {
  const form = new FormData();
  if (photo) form.set("photo", new Blob([photo], { type: "image/png" }));
  for (const [k, v] of Object.entries({ caption: "Unwrapped at the office", who: "", productSlug: "love-scroll", consent: "yes", ...fields })) form.set(k, v);
  return route.POST(new Request("http://localhost/api/admin/moments", { method: "POST", headers: { origin: "http://localhost" }, body: form }));
}
const photoStatus = async (image: string) => (await serve.GET(new Request(`http://localhost${image}`), { params: Promise.resolve({ file: image.split("/").pop()! }) })).status;
const captions = (list: Moment[]) => list.map((m) => m.caption);

beforeAll(async () => {
  const batch = db().batch();
  SEED_CATALOG.products.forEach((p, i) => batch.set(db().doc(`products/${p.id}`), { ...p, sortOrder: i }));
  await batch.commit();
});

beforeEach(async () => {
  session.signedIn = true;
  cache.updateTag.mockClear();
  cache.revalidateTag.mockClear();
  const snap = await db().collection("moments").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
  await db().doc("settings/shop").set({ craftingDays: 3 });
});

describe("the built-in moments", () => {
  it("show in the shop until admin first opens Moments, which loads them once", async () => {
    expect(captions(await getPublicMoments())).toEqual(captions(BUILT_IN_MOMENTS));
    expect((await readMoments()).length).toBe(4);

    expect((await actions.removeMoment("m02")).ok).toBe(true);
    expect((await readMoments()).length).toBe(3); // a deleted one doesn't come back
    expect(captions(await getPublicMoments())).not.toContain("The moment she unrolled it");
  });
});

describe("adding a moment", () => {
  it("puts it first, stores the photo privately, and refreshes the shop", async () => {
    const res = await add();
    expect(res.status).toBe(200);
    const list = await getPublicMoments();
    expect(list[0].caption).toBe("Unwrapped at the office");
    expect(list[0].productSlug).toBe("love-scroll");
    expect(list[0].image).toMatch(/^\/catalog-photo\/moment-[0-9a-f-]{36}\.png$/);
    expect(await photoStatus(list[0].image!)).toBe(200);
    expect(list.length).toBe(5);
    expect(cache.revalidateTag).toHaveBeenCalled();
  });

  it("needs the customer's OK, a real photo, a caption and a real product", async () => {
    expect((await add({ consent: "" })).status).toBe(400);
    expect((await add({}, null)).status).toBe(400);
    expect((await add({}, new TextEncoder().encode("<script>alert(1)</script>"))).status).toBe(400);
    expect((await add({ caption: "" })).status).toBe(400);
    expect((await add({ productSlug: "not-a-product" })).status).toBe(400);
    expect((await db().collection("moments").where("caption", "==", "Unwrapped at the office").get()).size).toBe(0);
  });

  it("only staff can add", async () => {
    session.signedIn = false;
    expect((await add()).status).toBe(401);
  });
});

describe("managing moments", () => {
  it("edits, hides, moves and deletes, taking an uploaded photo with it", async () => {
    await add();
    const [added] = await readMoments();

    expect((await actions.saveMoment(added.id, { caption: "Opened at her desk", who: "Ada, Ikeja", productSlug: "" })).ok).toBe(true);
    expect((await readMoments())[0]).toMatchObject({ caption: "Opened at her desk", who: "Ada, Ikeja", productSlug: null });

    expect((await actions.showMoment(added.id, false)).ok).toBe(true);
    expect(captions(await getPublicMoments())).not.toContain("Opened at her desk");
    expect((await actions.showMoment(added.id, true)).ok).toBe(true);

    expect((await actions.reorderMoment(added.id, "up")).ok).toBe(false); // already first
    expect((await actions.reorderMoment(added.id, "down")).ok).toBe(true);
    expect((await readMoments())[1].id).toBe(added.id);

    expect((await actions.removeMoment(added.id)).ok).toBe(true);
    expect(await photoStatus(added.image!)).toBe(404);
    expect(cache.updateTag).toHaveBeenCalled();
  });

  it("refuses made-up ids, bad captions, and signed-out calls", async () => {
    await readMoments();
    expect((await actions.saveMoment("no-such", { caption: "Hello there", who: "", productSlug: "" })).ok).toBe(false);
    expect((await actions.saveMoment("m01", { caption: "", who: "", productSlug: "" })).ok).toBe(false);
    expect((await actions.removeMoment("../m01")).ok).toBe(false);
    session.signedIn = false;
    expect((await actions.removeMoment("m01")).ok).toBe(false);
    expect((await readMoments()).length).toBe(4);
  });
});
