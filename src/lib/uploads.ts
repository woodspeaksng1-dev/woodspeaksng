import { z } from "zod";
import type { CartCustomization } from "./types";

/*
 * Customer files: locket and polaroid photos, NFC tag videos. Shared by the customizer and the server.
 * The browser sends the file straight to private storage (a resumable upload the server opens for it);
 * the order keeps only our upload id. Until uploads are switched on (UPLOADS_ENABLED, needs the Blaze
 * plan), or if an upload fails, the buyer sends the file on WhatsApp after paying.
 */

export type UploadKind = "photo" | "video";

export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/x-m4v"] as const;

/** Each piece of a resumable upload. Google needs a multiple of 256 KiB; 8 MiB suits mobile data. */
export const CHUNK_BYTES = 8 * 1024 * 1024;

export const uploadId = z.uuid();

export const startUploadSchema = z.object({
  productId: z.string().min(1).max(80),
  kind: z.enum(["photo", "video"]),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

/** Why this file can't be uploaded for that kind, or null if it can. `maxBytes` is the product's limit. */
export function fileProblem(kind: UploadKind, contentType: string, size: number, maxBytes: number): string | null {
  const types: readonly string[] = kind === "photo" ? PHOTO_TYPES : VIDEO_TYPES;
  if (!types.includes(contentType)) return kind === "photo" ? "Choose a JPG, PNG or WebP photo." : "Choose an MP4 or MOV video.";
  if (size > maxBytes) return `That file is over ${Math.floor(maxBytes / (1024 * 1024))} MB.`;
  return null;
}

/** A line's file that we don't have yet, so the buyer sends it on WhatsApp. */
export function fileStillNeeded(c: CartCustomization): UploadKind | null {
  if (c.kind === "photo") return (c.uploadIds?.length ?? 0) < c.photoNames.length ? "photo" : null;
  if (c.kind === "video" && c.source === "file") return c.uploadId ? null : "video";
  return null;
}

/** The WhatsApp message a buyer sends with their file, naming the order and what it's for. */
export function sendFileMessage(orderNumber: string, items: { name: string; kind: UploadKind }[]) {
  const what = items.map((i) => `the ${i.kind} for the ${i.name}`).join(" and ");
  return `Hello Woodspeaks, here is ${what} on order ${orderNumber}.`;
}
