import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { Product } from "@/lib/types";
import { db, storageBucket } from "./firebase";
import type { SignedInStaff } from "./staff";

/*
 * Product photos uploaded by staff in admin. The browser shrinks the photo first (PRODUCT_PHOTO_MAX_EDGE);
 * the server checks it really is a JPEG, PNG or WebP image, stores it privately in the bucket under
 * catalog/, and sets the product's `image` to /catalog-photo/<file>, which serves it with a year-long
 * cache (every upload gets a new name, so a new photo is never confused with an old one). The photo it
 * replaces is deleted.
 *
 * A product has one main photo (`image`: cards, cart, sharing) and up to MAX_EXTRA_PHOTOS more (`gallery`),
 * shown after it on the product page. Staff reorder them, make one the main photo, or remove them.
 */

export const PRODUCT_PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const MAX_EXTRA_PHOTOS = 6;
const PREFIX = "catalog/";
export const PHOTO_ROUTE = "/catalog-photo/";
/** A stored file name: product id, a random id, and the type. */
export const PHOTO_FILE = /^[a-z0-9-]{1,64}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/;

const TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" } as const;
type PhotoType = keyof typeof TYPES;

/** What the first bytes say the file is, whatever its name or the browser claim. */
function sniff(bytes: Uint8Array): PhotoType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export type PhotoResult = { ok: true; message: string; image: string | null } | { ok: false; message: string };

const fileOf = (image: string | undefined) => {
  const name = image?.startsWith(PHOTO_ROUTE) ? image.slice(PHOTO_ROUTE.length) : null;
  return name && PHOTO_FILE.test(name) ? name : null;
};

/** Deletes a photo this file stored, given its /catalog-photo address. Anything else is left alone. */
export async function deletePhoto(image: string | null | undefined) {
  await deleteStored(fileOf(image ?? undefined));
}

async function deleteStored(name: string | null) {
  if (!name) return;
  try {
    await (await storageBucket()).file(PREFIX + name).delete({ ignoreNotFound: true });
  } catch (error) {
    console.error(`Product photos: couldn't delete the old photo ${name}.`, error);
  }
}

/** Checks the bytes really are a photo, then the first half of storing one: is it acceptable? */
function checkPhoto(bytes: Uint8Array): { ok: false; message: string } | { ok: true; type: PhotoType } {
  if (bytes.length === 0) return { ok: false, message: "That file is empty." };
  if (bytes.length > PRODUCT_PHOTO_MAX_BYTES) return { ok: false, message: "That photo is too large. Try a smaller one." };
  const type = sniff(bytes);
  if (!type) return { ok: false, message: "Choose a JPG, PNG or WebP photo." };
  return { ok: true, type };
}

/** Stores a checked photo privately as <base>-<random id>.<type> and returns its /catalog-photo address. */
async function store(bytes: Uint8Array, type: PhotoType, base: string): Promise<{ name: string; image: string }> {
  const name = `${base}-${randomUUID()}.${TYPES[type]}`;
  await (await storageBucket()).file(PREFIX + name).save(Buffer.from(bytes), {
    resumable: false,
    metadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
  });
  return { name, image: PHOTO_ROUTE + name };
}

/** For other admin photos (customer moments): checks and stores one, named after `base`. */
export async function storePhoto(bytes: Uint8Array, base: string): Promise<{ ok: false; message: string } | { ok: true; image: string }> {
  const check = checkPhoto(bytes);
  if (!check.ok) return check;
  return { ok: true, image: (await store(bytes, check.type, base)).image };
}

export async function saveProductPhoto(staff: SignedInStaff, productId: string, bytes: Uint8Array): Promise<PhotoResult> {
  const check = checkPhoto(bytes);
  if (!check.ok) return check;

  const ref = db().collection("products").doc(productId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: "That product doesn't exist." };

  const { name, image } = await store(bytes, check.type, productId);

  const before = await db().runTransaction(async (t) => {
    const current = await t.get(ref);
    const product = current.data() as Product;
    t.update(ref, { image, updatedAt: new Date().toISOString() });
    t.create(db().collection("auditLog").doc(), { at: new Date().toISOString(), by: staff.email, action: `new photo for ${product.name}`, target: name });
    return product.image;
  });
  await deleteStored(fileOf(before));
  return { ok: true, message: "Photo saved. The shop shows it now.", image };
}

/**
 * Takes the main photo off a product. The first of its other photos takes its place; with none, the shop
 * goes back to the site's own photo or the drawn placeholder.
 */
export async function removeProductPhoto(staff: SignedInStaff, productId: string): Promise<PhotoResult> {
  const ref = db().collection("products").doc(productId);
  const done = await db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return undefined;
    const product = snap.data() as Product;
    if (!product.image) return null;
    const [next, ...rest] = product.gallery ?? [];
    t.update(ref, { image: next ?? FieldValue.delete(), gallery: rest, updatedAt: new Date().toISOString() });
    t.create(db().collection("auditLog").doc(), { at: new Date().toISOString(), by: staff.email, action: `removed the photo of ${product.name}`, target: product.image });
    return { before: product.image, next: next ?? null };
  });
  if (done === undefined) return { ok: false, message: "That product doesn't exist." };
  await deleteStored(fileOf(done?.before));
  return { ok: true, message: done?.next ? "Photo removed. The next photo is the main one now." : "Photo removed.", image: done?.next ?? null };
}

/** Adds one more photo after the others. A product with no main photo gets this one as its main photo. */
export async function addProductPhoto(staff: SignedInStaff, productId: string, bytes: Uint8Array): Promise<PhotoResult> {
  const check = checkPhoto(bytes);
  if (!check.ok) return check;
  const full = { ok: false as const, message: `A product can have ${MAX_EXTRA_PHOTOS} photos besides the main one. Remove one first.` };

  const ref = db().collection("products").doc(productId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: "That product doesn't exist." };
  if (((snap.data() as Product).gallery ?? []).length >= MAX_EXTRA_PHOTOS) return full;

  const { name, image } = await store(bytes, check.type, productId);
  const added = await db().runTransaction(async (t) => {
    const product = (await t.get(ref)).data() as Product;
    const gallery = product.gallery ?? [];
    if (gallery.length >= MAX_EXTRA_PHOTOS) return null; // filled up while this one was uploading
    t.update(ref, product.image ? { gallery: [...gallery, image], updatedAt: new Date().toISOString() } : { image, updatedAt: new Date().toISOString() });
    t.create(db().collection("auditLog").doc(), { at: new Date().toISOString(), by: staff.email, action: `added a photo to ${product.name}`, target: name });
    return product.image ? "extra" : "main";
  });
  if (!added) {
    await deleteStored(name);
    return full;
  }
  return { ok: true, message: added === "main" ? "Photo saved as the main photo." : "Photo added. The product page shows it now.", image };
}

export type PhotoMove = "up" | "down" | "main" | "remove";

/** One of a product's other photos: move it earlier or later, make it the main photo, or remove it. */
export async function arrangeProductPhoto(staff: SignedInStaff, productId: string, image: string, move: PhotoMove): Promise<PhotoResult> {
  const ref = db().collection("products").doc(productId);
  const result = await db().runTransaction(async (t): Promise<{ ok: false; message: string } | { ok: true; removed: string | null }> => {
    const snap = await t.get(ref);
    if (!snap.exists) return { ok: false, message: "That product doesn't exist." };
    const product = snap.data() as Product;
    const gallery = [...(product.gallery ?? [])];
    const at = gallery.indexOf(image);
    if (at < 0) return { ok: false, message: "That photo isn't on this product any more. Refresh the page." };

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    let removed: string | null = null;
    if (move === "remove") {
      gallery.splice(at, 1);
      removed = image;
    } else if (move === "main") {
      // The main photo takes this one's place, so nothing is lost.
      if (product.image) gallery[at] = product.image;
      else gallery.splice(at, 1);
      update.image = image;
    } else {
      const to = move === "up" ? at - 1 : at + 1;
      if (!gallery[to]) return { ok: false, message: move === "up" ? "It's already first." : "It's already last." };
      [gallery[at], gallery[to]] = [gallery[to], gallery[at]];
    }
    t.update(ref, { ...update, gallery });
    const action = { remove: "removed a photo of", main: "chose a new main photo for", up: "reordered the photos of", down: "reordered the photos of" }[move];
    t.create(db().collection("auditLog").doc(), { at: new Date().toISOString(), by: staff.email, action: `${action} ${product.name}`, target: image });
    return { ok: true, removed };
  });
  if (!result.ok) return result;
  await deleteStored(fileOf(result.removed ?? undefined));
  const message = { remove: "Photo removed.", main: "That's the main photo now.", up: "Moved.", down: "Moved." }[move];
  return { ok: true, message, image };
}

/** A stored photo's bytes and type, for /catalog-photo. Null if there's no such file. */
export async function readProductPhoto(name: string): Promise<{ bytes: Buffer; type: string } | null> {
  if (!PHOTO_FILE.test(name)) return null;
  const file = (await storageBucket()).file(PREFIX + name);
  try {
    const [bytes] = await file.download();
    const type = name.endsWith(".webp") ? "image/webp" : name.endsWith(".png") ? "image/png" : "image/jpeg";
    return { bytes, type };
  } catch (error) {
    if ((error as { code?: number }).code === 404) return null;
    throw error;
  }
}
