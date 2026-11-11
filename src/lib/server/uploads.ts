import "server-only";
import { randomUUID } from "node:crypto";
import type { Product } from "@/lib/types";
import { PHOTO_MAX_BYTES, fileProblem, fileStillNeeded, type UploadKind } from "@/lib/uploads";
import type { PricedLine } from "@/lib/order-pricing";
import { db, storageBucket } from "./firebase";

/*
 * Customer files in private storage (`uploads/{id}` in the bucket, a record in Firestore `uploads/{id}`).
 * The server opens a resumable upload fixed to one content type and exact size, and the browser sends the
 * bytes straight to Google (nothing goes through Vercel). Storage rules deny every browser read and write;
 * only these functions (Admin) and the upload session touch the files. At checkout each id is checked
 * against the stored file; when the order is paid the upload is linked to it. Files no paid order uses
 * are deleted by the daily job after a week.
 */

export interface StoredUpload {
  id: string;
  kind: UploadKind;
  productId: string;
  contentType: string;
  size: number;
  path: string;
  sessionUri: string;
  createdAt: string;
  orderNumber: string | null;
}

/** Off until the Blaze plan is on (UPLOADS_ENABLED=1); buyers send files on WhatsApp meanwhile. */
export const uploadsEnabled = () => process.env.UPLOADS_ENABLED === "1";

const uploads = () => db().collection("uploads");
const KEEP_UNPAID_DAYS = 7;

/** The largest file this product takes of this kind, or null if it takes none. */
export function maxBytesFor(product: Product, kind: UploadKind): number | null {
  const p = product.personalization;
  if (kind === "photo" && p.kind === "photo") return PHOTO_MAX_BYTES;
  if (kind === "video" && p.kind === "video") return p.maxMb * 1024 * 1024;
  return null;
}

/**
 * Opens a resumable upload for one file. `origin` is the shop's own origin (checked by the route), so
 * Google lets that page send the bytes. Returns our id and the session address the browser uploads to.
 */
export async function startUpload(
  input: { productId: string; kind: UploadKind; contentType: string; size: number },
  product: Product,
  origin: string,
): Promise<{ ok: true; id: string; sessionUri: string } | { ok: false; message: string }> {
  const max = maxBytesFor(product, input.kind);
  if (max == null) return { ok: false, message: "This product doesn't take that kind of file." };
  const problem = fileProblem(input.kind, input.contentType, input.size, max);
  if (problem) return { ok: false, message: problem };

  const id = randomUUID();
  const path = `uploads/${id}`;
  const [sessionUri] = await (await storageBucket()).file(path).createResumableUpload({
    origin,
    metadata: { contentType: input.contentType, contentLength: input.size, metadata: { uploadId: id, productId: product.id } },
  });
  const record: StoredUpload = {
    id,
    kind: input.kind,
    productId: product.id,
    contentType: input.contentType,
    size: input.size,
    path,
    sessionUri,
    createdAt: new Date().toISOString(),
    orderNumber: null,
  };
  await uploads().doc(id).set(record);
  return { ok: true, id, sessionUri };
}

/**
 * How many bytes Google has of this upload, so the browser can carry on after a dropped connection.
 * `done` when the file is complete; null when the upload doesn't exist or has expired (a week).
 */
export async function uploadProgress(id: string): Promise<{ received: number; size: number; done: boolean } | null> {
  const snap = await uploads().doc(id).get();
  if (!snap.exists) return null;
  const u = snap.data() as StoredUpload;
  const res = await fetch(u.sessionUri, {
    method: "PUT",
    headers: { "Content-Range": `bytes */${u.size}`, "Content-Length": "0" },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 200 || res.status === 201) return { received: u.size, size: u.size, done: true };
  if (res.status === 308) {
    const range = res.headers.get("range"); // "bytes=0-1234"; absent when nothing has arrived yet
    const received = range ? Number(range.split("-")[1]) + 1 : 0;
    return { received, size: u.size, done: false };
  }
  return null;
}

/**
 * Checks every upload id on the order's lines: it's ours, for that product and kind, complete in storage
 * with the size and type we opened it for, and not already part of another paid order.
 * Returns the first problem as a message for the buyer, or null.
 */
export async function checkLineUploads(lines: PricedLine[]): Promise<string | null> {
  const wanted: { id: string; kind: UploadKind; productId: string; name: string }[] = [];
  for (const l of lines) {
    const c = l.customization;
    if (c.kind === "photo") for (const id of c.uploadIds ?? []) wanted.push({ id, kind: "photo", productId: l.productId, name: l.name });
    if (c.kind === "video" && c.source === "file" && c.uploadId) wanted.push({ id: c.uploadId, kind: "video", productId: l.productId, name: l.name });
  }
  if (wanted.length === 0) return null;
  if (new Set(wanted.map((w) => w.id)).size !== wanted.length) return "The same file is on two items. Choose it again on one of them.";

  const bucket = await storageBucket();
  const snaps = await db().getAll(...wanted.map((w) => uploads().doc(w.id)));
  for (const [i, snap] of snaps.entries()) {
    const w = wanted[i];
    const again = `We couldn't find your ${w.kind} for the ${w.name}. Remove it from your cart and add it again.`;
    if (!snap.exists) return again;
    const u = snap.data() as StoredUpload;
    if (u.kind !== w.kind || u.productId !== w.productId) return again;
    if (u.orderNumber) return `Your ${w.kind} for the ${w.name} is already on another order. Choose it again.`;
    const [exists] = await bucket.file(u.path).exists();
    if (!exists) return `Your ${w.kind} for the ${w.name} didn't finish uploading. Remove it from your cart and add it again.`;
    const [meta] = await bucket.file(u.path).getMetadata();
    if (Number(meta.size) !== u.size || meta.contentType !== u.contentType) return again;
  }
  return null;
}

/** The upload ids on these lines, for linking them to the order once it's paid. */
export const uploadIdsOf = (lines: PricedLine[]) =>
  lines.flatMap((l) =>
    l.customization.kind === "photo"
      ? (l.customization.uploadIds ?? [])
      : l.customization.kind === "video" && l.customization.source === "file" && l.customization.uploadId
        ? [l.customization.uploadId]
        : [],
  );

/** Whether any line still needs its file sent on WhatsApp. */
export const anyFileStillNeeded = (lines: PricedLine[]) => lines.some((l) => fileStillNeeded(l.customization));

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/3gpp": ".3gp",
  "video/x-m4v": ".m4v",
};

/**
 * A short-lived link for staff to download (or view) a file of a paid order. It always downloads as an
 * attachment, so a file can't open as a page.
 */
export async function downloadLink(id: string, filename: string): Promise<string | null> {
  const snap = await uploads().doc(id).get();
  if (!snap.exists) return null;
  const u = snap.data() as StoredUpload;
  const ext = EXTENSIONS[u.contentType] ?? "";
  const safeName = (filename.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "file") + ext;
  const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const bucket = await storageBucket();
  if (emulator) return `http://${emulator}/download/storage/v1/b/${bucket.name}/o/${encodeURIComponent(u.path)}?alt=media`;
  const [url] = await bucket.file(u.path).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000,
    responseDisposition: `attachment; filename="${safeName}"`,
  });
  return url;
}

/** Daily: deletes files no paid order uses, a week after they were uploaded. Returns how many. */
export async function deleteUnusedUploads(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - KEEP_UNPAID_DAYS * 86_400_000).toISOString();
  const snap = await uploads().where("orderNumber", "==", null).limit(300).get();
  const old = snap.docs.filter((d) => (d.get("createdAt") as string) < cutoff);
  if (old.length === 0) return 0;
  const bucket = await storageBucket();
  let deleted = 0;
  for (const d of old) {
    try {
      await bucket.file(d.get("path") as string).delete({ ignoreNotFound: true });
      await d.ref.delete();
      deleted++;
    } catch (error) {
      console.error(`Uploads: couldn't delete ${d.id}.`, error);
    }
  }
  return deleted;
}
