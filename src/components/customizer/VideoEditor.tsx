"use client";

import { useRef } from "react";

export interface ChosenVideo {
  url: string;
  name: string;
  sizeMb: number;
}

export type VideoSource = "file" | "link";

const ACCEPT = "video/mp4,video/quicktime,video/*";

/** Host name of a link, for showing it back to the buyer ("youtube.com"). */
function hostOf(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** What will go on the tag: the chosen video playing, or the pasted link, or how it works. */
export function VideoPreview({ source, video, link }: { source: VideoSource; video: ChosenVideo | null; link: string }) {
  const host = source === "link" ? hostOf(link.trim()) : null;
  return (
    <figure aria-label="Preview of your NFC video" className="mx-auto w-full max-w-md">
      {source === "file" && video ? (
        <video src={video.url} controls playsInline className="aspect-video w-full rounded-2xl bg-ink shadow-card" />
      ) : source === "link" && host ? (
        <div className="rounded-2xl border border-rule bg-vellum p-6 shadow-card">
          <p className="text-sm text-ink-soft">Your video link</p>
          <p className="mt-1 font-display text-2xl text-oxblood">{host}</p>
          <p className="mt-1 text-sm break-all text-ink-soft">{link.trim()}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-rule bg-vellum p-6 shadow-card">
          <p className="font-display text-2xl text-oxblood">How it works</p>
          <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-ink">
            <li>Add your video, or a link to it.</li>
            <li>We put it on a small NFC tag that comes with the gift.</li>
            <li>They tap their phone on the tag and your video plays.</li>
          </ol>
        </div>
      )}
    </figure>
  );
}

/** Upload a video file (up to `maxMb`) or paste a link to one. */
export function VideoEditor({
  source,
  onSource,
  video,
  onVideo,
  link,
  onLink,
  maxMb,
  error,
  onError,
}: {
  source: VideoSource;
  onSource: (s: VideoSource) => void;
  video: ChosenVideo | null;
  onVideo: (v: ChosenVideo) => void;
  link: string;
  onLink: (link: string) => void;
  maxMb: number;
  error: string | null;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = (file: File | undefined) => {
    if (!file) return;
    const sizeMb = file.size / (1024 * 1024);
    if (!file.type.startsWith("video/")) return onError("That isn't a video. Choose an MP4 or MOV file.");
    if (sizeMb > maxMb)
      return onError(`That video is ${Math.ceil(sizeMb)} MB; the most we can take is ${maxMb} MB. Trim it, or paste a link instead.`);
    onError(null);
    onVideo({ url: URL.createObjectURL(file), name: file.name, sizeMb: Math.round(sizeMb * 10) / 10 });
  };

  const option = (value: VideoSource, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={source === value}
      onClick={() => {
        onError(null);
        onSource(value);
      }}
      className={`h-10 flex-1 rounded-full text-sm transition-colors ${
        source === value ? "bg-oxblood text-vellum" : "text-ink hover:text-oxblood"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="How do you want to add your video?" className="flex gap-1 rounded-full border border-rule bg-vellum p-1">
        {option("file", "Upload a video")}
        {option("link", "Paste a link")}
      </div>

      {source === "file" ? (
        <div>
          <p className="font-display text-xl text-oxblood">Your video</p>
          <p className="mt-1 text-sm text-ink-soft">MP4 or MOV, up to {maxMb} MB. A video from your phone works well.</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            id="video"
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
            {video ? "Choose a different video" : "Choose a video"}
          </button>
          {video && (
            <p className="mt-2 truncate text-sm text-ink-soft">
              {video.name} · {video.sizeMb} MB
            </p>
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="video-link" className="font-display text-xl text-oxblood">
            Link to your video
          </label>
          <p id="video-link-hint" className="mt-1 text-sm text-ink-soft">
            YouTube, Google Drive, Instagram or any other link. Make sure anyone with the link can watch it.
          </p>
          <input
            id="video-link"
            type="url"
            inputMode="url"
            autoComplete="off"
            value={link}
            onChange={(e) => {
              onError(null);
              onLink(e.target.value);
            }}
            placeholder="https://"
            aria-describedby="video-link-hint"
            className="mt-3 h-11 w-full rounded-xl border border-rule bg-vellum px-3 text-ink outline-none focus:border-oxblood"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-oxblood">
          {error}
        </p>
      )}
    </div>
  );
}
