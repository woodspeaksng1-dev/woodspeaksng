"use client";

import { useRef } from "react";
import type { PhotoCrop } from "@/lib/types";
import { PHOTO_MAX_BYTES, PHOTO_TYPES } from "@/lib/uploads";
import { LocketFrame } from "./LocketFrame";

export interface ChosenPhoto {
  url: string;
  name: string;
  width: number;
  height: number;
  file: File;
}

export type PhotoFrameKind = "locket" | "polaroid";

/** Below this many source pixels across the frame, the print may look soft. */
const MIN_PIXELS: Record<PhotoFrameKind, number> = { locket: 600, polaroid: 1000 };

const clampOffset = (v: number, zoom: number) => {
  const max = ((zoom - 1) / 2) * 100;
  return Math.max(-max, Math.min(max, v));
};

/** The photo inside its frame. Drag to move it when `editable`. */
export function PhotoFrame({
  kind,
  photo,
  crop,
  onCropChange,
}: {
  kind: PhotoFrameKind;
  photo: Pick<ChosenPhoto, "url"> | null;
  crop: PhotoCrop;
  onCropChange?: (crop: PhotoCrop) => void;
}) {
  const drag = useRef<{ x: number; y: number; crop: PhotoCrop; size: number } | null>(null);

  const opening = (
    <div
      className={`relative aspect-square touch-none overflow-hidden select-none ${
        kind === "locket" ? "h-full w-full rounded-full bg-brass-dark" : "bg-paper-shade/50"
      } ${onCropChange && photo ? "cursor-grab active:cursor-grabbing" : ""}`}
      onPointerDown={(e) => {
        if (!onCropChange || !photo) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, crop, size: e.currentTarget.clientWidth };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || !onCropChange) return;
        onCropChange({
          ...d.crop,
          x: clampOffset(d.crop.x + ((e.clientX - d.x) / d.size) * 100, d.crop.zoom),
          y: clampOffset(d.crop.y + ((e.clientY - d.y) / d.size) * 100, d.crop.zoom),
        });
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt="Your photo"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})` }}
        />
      ) : (
        <span
          className={`absolute inset-0 flex items-center justify-center px-6 text-center font-display italic ${
            kind === "locket" ? "text-brass-light" : "text-ink/45"
          }`}
        >
          Your photo
        </span>
      )}
    </div>
  );

  if (kind === "locket") {
    return <LocketFrame>{opening}</LocketFrame>;
  }
  return (
    <figure aria-label="Preview of your polaroid" className="mx-auto w-full max-w-xs bg-vellum p-[6%] pb-[22%] shadow-card">
      {opening}
    </figure>
  );
}

/** Choose a photo, then zoom and drag it into place. */
export function PhotoEditor({
  kind,
  photo,
  onPhoto,
  crop,
  onCropChange,
  error,
  onError,
}: {
  kind: PhotoFrameKind;
  photo: ChosenPhoto | null;
  onPhoto: (photo: ChosenPhoto) => void;
  crop: PhotoCrop;
  onCropChange: (crop: PhotoCrop) => void;
  error: string | null;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shortSide = photo ? Math.min(photo.width, photo.height) / crop.zoom : Infinity;
  const soft = shortSide < MIN_PIXELS[kind];

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (file.size > PHOTO_MAX_BYTES) return onError("That photo is over 15 MB. Choose a smaller one.");
    if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return onError("Choose a JPG, PNG or WebP photo.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      onError(null);
      onPhoto({ url, name: file.name, width: img.naturalWidth, height: img.naturalHeight, file });
      onCropChange({ zoom: 1, x: 0, y: 0 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      onError("We couldn't open that photo. Try a JPG or PNG.");
    };
    img.src = url;
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-display text-xl text-oxblood">Your photo</p>
        <p className="mt-1 text-sm text-ink-soft">A clear photo with good light works best. JPG, PNG or WebP, up to 15 MB.</p>
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          id="photo"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 h-11 rounded-full border border-oxblood px-6 text-oxblood transition-colors hover:bg-oxblood hover:text-vellum"
        >
          {photo ? "Choose a different photo" : "Choose a photo"}
        </button>
        {photo && <p className="mt-2 truncate text-sm text-ink-soft">{photo.name}</p>}
        {error && (
          <p role="alert" className="mt-2 text-sm text-oxblood">
            {error}
          </p>
        )}
      </div>

      {photo && (
        <div>
          <label htmlFor="zoom" className="text-sm text-ink-soft">
            Zoom, then drag the photo in the preview to move it
          </label>
          <input
            id="zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={crop.zoom}
            onChange={(e) => {
              const zoom = Number(e.target.value);
              onCropChange({ zoom, x: clampOffset(crop.x, zoom), y: clampOffset(crop.y, zoom) });
            }}
            className="mt-2 w-full accent-oxblood"
          />
          {soft && (
            <p role="status" className="mt-2 rounded-xl bg-vellum p-3 text-sm text-ink">
              This photo is quite small, so it may print a little soft. Zoom out, or choose a larger photo if you have
              one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
