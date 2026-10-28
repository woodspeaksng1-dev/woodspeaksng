import { MEDIA_FILES } from "./media-manifest";

/*
 * Real photos and videos live in public/media. Name an image and a video the same
 * (e.g. hero/product.webp + hero/product.mp4): the image becomes the video's poster.
 * Anything missing falls back to the drawn placeholder, so the site works before
 * every asset exists. See public/media/README.md for the full list of slots.
 */
const files = new Set(MEDIA_FILES);
const IMAGE_EXT = ["avif", "webp", "jpg", "jpeg", "png", "svg"];
const VIDEO_EXT = [
  ["webm", "video/webm"],
  ["mp4", "video/mp4"],
] as const;

export interface VideoSource {
  src: string;
  type: string;
}

export function imageSrc(key: string): string | null {
  const k = key.toLowerCase();
  for (const ext of IMAGE_EXT) if (files.has(`${k}.${ext}`)) return `/media/${k}.${ext}`;
  return null;
}

export function videoSources(key: string): VideoSource[] {
  const k = key.toLowerCase();
  return VIDEO_EXT.filter(([ext]) => files.has(`${k}.${ext}`)).map(([ext, type]) => ({
    src: `/media/${k}.${ext}`,
    type,
  }));
}
