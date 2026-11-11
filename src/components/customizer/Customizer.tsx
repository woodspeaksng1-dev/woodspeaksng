"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import type { CartCustomization, PhotoCrop, Product } from "@/lib/types";
import { letterSchema, reasonsSchema, videoLinkSchema } from "@/lib/validation";
import { LetterEditor } from "./LetterEditor";
import { ScrollPreview } from "./ScrollPreview";
import { ReasonsEditor, type ReasonsMode } from "./ReasonsEditor";
import { PuzzlePreview } from "./PuzzlePreview";
import { PhotoEditor, PhotoFrame, type ChosenPhoto, type PhotoFrameKind } from "./PhotoEditor";
import { STANDARD_REASONS } from "@/lib/drafts";
import { VideoEditor, VideoPreview, type ChosenVideo, type VideoSource } from "./VideoEditor";
import { useUpload, type UploadState } from "./upload";

interface Draft {
  letter: string;
  reasonsMode: ReasonsMode;
  reasons: string[];
  videoSource: VideoSource;
  videoLink: string;
}

const draftKey = (slug: string) => `ws-draft-${slug}`;

function loadDraft(slug: string, count: number): Draft {
  const empty: Draft = { letter: "", reasonsMode: "standard", reasons: Array(count).fill(""), videoSource: "file", videoLink: "" };
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey(slug)) ?? "null") as Partial<Draft> | null;
    if (!saved) return empty;
    return {
      letter: typeof saved.letter === "string" ? saved.letter : "",
      reasonsMode: saved.reasonsMode === "custom" ? "custom" : "standard",
      reasons: Array.from({ length: count }, (_, i) => (typeof saved.reasons?.[i] === "string" ? saved.reasons[i] : "")),
      videoSource: saved.videoSource === "link" ? "link" : "file",
      videoLink: typeof saved.videoLink === "string" ? saved.videoLink : "",
    };
  } catch {
    return empty;
  }
}

/** How the buyer's file is getting to us: uploading, uploaded, failed (with a way out), or by WhatsApp. */
function FileStatus({
  what,
  state,
  uploads,
  sendLater,
  onRetry,
  onSendLater,
}: {
  what: "photo" | "video";
  state: UploadState;
  uploads: boolean;
  sendLater: boolean;
  onRetry: () => void;
  onSendLater: () => void;
}) {
  if (!uploads || sendLater)
    return (
      <p role="status" className="mt-4 rounded-xl bg-vellum p-3 text-sm text-ink">
        After you pay, we&rsquo;ll ask you to send this {what} to us on WhatsApp, so we get it at full quality.
      </p>
    );
  if (state.status === "uploading")
    return (
      <div role="status" className="mt-4">
        <p className="text-sm text-ink-soft">
          Uploading your {what} · {Math.round(state.fraction * 100)}%
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-shade">
          <div className="h-full rounded-full bg-oxblood transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${state.fraction * 100}%` }} />
        </div>
      </div>
    );
  if (state.status === "done")
    return (
      <p role="status" className="mt-4 text-sm text-ink-soft">
        Your {what} is uploaded.
      </p>
    );
  if (state.status === "failed")
    return (
      <div role="alert" className="mt-4 rounded-xl border border-rule bg-vellum p-4 text-sm">
        <p className="text-oxblood">{state.message}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onRetry} className="h-10 rounded-full bg-oxblood px-5 text-vellum transition-colors hover:bg-wine">
            Try the upload again
          </button>
          <button type="button" onClick={onSendLater} className="h-10 rounded-full border border-oxblood px-5 text-oxblood transition-colors hover:bg-oxblood hover:text-vellum">
            Send it on WhatsApp after paying
          </button>
        </div>
      </div>
    );
  return null;
}

/**
 * The customizer: write (or pick a photo) with a live preview, then a final check with a
 * required spelling tick, then add to cart. Text drafts (and a video link) are kept in this
 * tab's session so a refresh doesn't lose them. A chosen photo or video starts uploading to private
 * storage straight away (when `uploads` is on); otherwise, or if the buyer gives up on a failed upload,
 * they send it on WhatsApp after paying.
 * Rendered on the client only (it reads the saved draft on first render).
 */
export function Customizer({ product, uploads }: { product: Product; uploads: boolean }) {
  const slug = product.slug;
  const p = product.personalization;
  const router = useRouter();
  const add = useCart((s) => s.add);

  const [draft, setDraft] = useState(() => loadDraft(slug, p.kind === "reasons" ? p.count : 0));
  const [photo, setPhoto] = useState<ChosenPhoto | null>(null);
  const [crop, setCrop] = useState<PhotoCrop>({ zoom: 1, x: 0, y: 0 });
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [video, setVideo] = useState<ChosenVideo | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [step, setStep] = useState<"write" | "check">("write");
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const photoUpload = useUpload(product.id, "photo", uploads);
  const videoUpload = useUpload(product.id, "video", uploads);
  // The buyer chose to send the file on WhatsApp instead (after a failed upload). Reset by a new file.
  const [sendLater, setSendLater] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey(slug), JSON.stringify(draft));
    } catch {}
  }, [slug, draft]);

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);
  useEffect(() => () => void (video && URL.revokeObjectURL(video.url)), [video]);

  const update = (patch: Partial<Draft>) => {
    setError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const frame: PhotoFrameKind = slug === "locket" ? "locket" : "polaroid";
  const price = product.price + (p.kind === "reasons" && draft.reasonsMode === "custom" ? p.fee : 0);
  const isPhoto = p.kind === "photo";
  const isVideo = p.kind === "video";
  const standardSet = p.kind === "reasons" && draft.reasonsMode === "standard";
  const hasFile = (isPhoto && !!photo) || (isVideo && draft.videoSource === "file" && !!video);
  const upload = isPhoto ? photoUpload : videoUpload;
  const uploadedId = upload.state.status === "done" ? upload.state.id : undefined;
  // Ready to add when there's no file, uploads are off, the buyer will send it later, or it's uploaded.
  const fileReady = !hasFile || !uploads || sendLater || !!uploadedId;

  const customization = (): CartCustomization | string => {
    if (p.kind === "letter") {
      const r = letterSchema(p.maxWords).safeParse(draft.letter);
      return r.success ? { kind: "letter", text: r.data } : r.error.issues[0].message;
    }
    if (p.kind === "reasons") {
      if (draft.reasonsMode === "standard") return { kind: "reasons", mode: "standard", reasons: [] };
      const r = reasonsSchema(p.count, p.maxWordsEach).safeParse(draft.reasons);
      if (r.success) return { kind: "reasons", mode: "custom", reasons: r.data };
      const empty = draft.reasons.filter((x) => !x.trim()).length;
      return empty ? `${empty} reason${empty === 1 ? " is" : "s are"} still empty.` : r.error.issues[0].message;
    }
    if (p.kind === "photo") {
      if (!photo) return "Choose a photo first.";
      return { kind: "photo", photoNames: [photo.name], crop, ...(uploadedId && !sendLater ? { uploadIds: [uploadedId] } : {}) };
    }
    if (p.kind === "video") {
      if (draft.videoSource === "file")
        return video
          ? { kind: "video", source: "file", fileName: video.name, sizeMb: video.sizeMb, ...(uploadedId && !sendLater ? { uploadId: uploadedId } : {}) }
          : "Choose your video first.";
      const r = videoLinkSchema.safeParse(draft.videoLink);
      return r.success ? { kind: "video", source: "link", url: r.data } : r.error.issues[0].message;
    }
    return { kind: "none" };
  };

  const preview = (
    <>
      {p.kind === "letter" && <ScrollPreview text={draft.letter} placeholder="Your letter appears here as you write it." />}
      {p.kind === "reasons" && (
        <PuzzlePreview reasons={draft.reasonsMode === "custom" ? draft.reasons : [...STANDARD_REASONS]} />
      )}
      {isPhoto && <PhotoFrame kind={frame} photo={photo} crop={crop} onCropChange={step === "write" ? setCrop : undefined} />}
      {isVideo && <VideoPreview source={draft.videoSource} video={video} link={draft.videoLink} />}
    </>
  );

  const goToCheck = () => {
    const c = customization();
    if (typeof c === "string") return setError(c);
    setChecked(false);
    setStep("check");
    window.scrollTo({ top: 0 });
  };

  const addToCart = () => {
    const c = customization();
    if (typeof c === "string" || !checked || !fileReady) return;
    add(product.id, c);
    try {
      sessionStorage.removeItem(draftKey(slug));
    } catch {}
    router.push(`/products/${slug}`);
  };

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-14">
      <div id="customizer-preview" className="scroll-mt-20 md:sticky md:top-24 md:self-start">
        {preview}
      </div>

      <div>
        <p className="text-sm text-ink-soft">
          <Link href={`/products/${slug}`} className="underline underline-offset-2 hover:text-oxblood">
            {product.name}
          </Link>{" "}
          · {formatNaira(price)}
        </p>

        {step === "write" ? (
          <>
            <h1 className="mt-2 text-4xl text-oxblood md:text-5xl">Personalise it</h1>
            <div className="mt-8">
              {p.kind === "letter" && (
                <LetterEditor text={draft.letter} onChange={(letter) => update({ letter })} maxWords={p.maxWords} />
              )}
              {p.kind === "reasons" && (
                <ReasonsEditor
                  mode={draft.reasonsMode}
                  onModeChange={(reasonsMode) => update({ reasonsMode })}
                  reasons={draft.reasons}
                  onChange={(reasons) => update({ reasons })}
                  price={product.price}
                  fee={p.fee}
                  maxWordsEach={p.maxWordsEach}
                />
              )}
              {isPhoto && (
                <PhotoEditor
                  kind={frame}
                  photo={photo}
                  onPhoto={(next) => {
                    setError(null);
                    setSendLater(false);
                    setPhoto(next);
                    photoUpload.start(next.file);
                  }}
                  crop={crop}
                  onCropChange={setCrop}
                  error={photoError}
                  onError={setPhotoError}
                />
              )}
              {p.kind === "video" && (
                <VideoEditor
                  source={draft.videoSource}
                  onSource={(videoSource) => update({ videoSource })}
                  video={video}
                  onVideo={(next) => {
                    setError(null);
                    setSendLater(false);
                    setVideo(next);
                    videoUpload.start(next.file);
                  }}
                  link={draft.videoLink}
                  onLink={(videoLink) => update({ videoLink })}
                  maxMb={p.maxMb}
                  error={videoError}
                  onError={setVideoError}
                />
              )}
            </div>
            {hasFile && (
              <FileStatus
                what={isPhoto ? "photo" : "video"}
                state={upload.state}
                uploads={uploads}
                sendLater={sendLater}
                onRetry={upload.retry}
                onSendLater={() => setSendLater(true)}
              />
            )}
            {error && (
              <p role="alert" className="mt-4 text-oxblood">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={goToCheck}
              className="mt-8 h-12 w-full rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine md:w-auto md:px-10"
            >
              Preview and check
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-4xl text-oxblood md:text-5xl">Check it before we make it</h1>
            <p className="mt-4 text-lg text-ink-soft">
              {isPhoto
                ? "This is how your photo will sit. We print it exactly as you've placed it."
                : isVideo
                  ? draft.videoSource === "file"
                    ? "This is the video we'll put on the tag. Play it through to check it's the right one."
                    : "This is the link we'll put on the tag. Open it once to check it plays for anyone with the link."
                  : standardSet
                  ? "These are the 20 reasons we print on your puzzle. Nothing to write, just check you're happy with them."
                  : "This is exactly what we'll write. Read it through once more for spelling and names."}
            </p>
            {p.kind === "reasons" && (
              <ol className="mt-6 grid gap-x-6 gap-y-1 text-ink sm:grid-cols-2">
                {(standardSet ? STANDARD_REASONS : draft.reasons).map((r, i) => (
                  <li key={i}>
                    <span className="mr-2 font-display text-oxblood tabular-nums">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ol>
            )}
            <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-2xl border border-rule bg-vellum p-4">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-oxblood"
              />
              <span>
                {isPhoto
                  ? "I've checked the photo and how it's placed."
                  : isVideo
                    ? draft.videoSource === "file"
                      ? "I've checked the video."
                      : "I've checked the link opens and plays."
                    : standardSet
                    ? "I'm happy with these reasons."
                    : "I've checked the spelling."}
                {!standardSet && (
                  <span className="mt-1 block text-sm text-ink-soft">
                    Personalised gifts are made just for you, so we can&rsquo;t refund mistakes in what you entered.
                  </span>
                )}
              </span>
            </label>
            {hasFile && (
              <FileStatus
                what={isPhoto ? "photo" : "video"}
                state={upload.state}
                uploads={uploads}
                sendLater={sendLater}
                onRetry={upload.retry}
                onSendLater={() => setSendLater(true)}
              />
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={!checked || !fileReady}
                onClick={addToCart}
                className="h-12 rounded-full bg-oxblood px-10 text-vellum transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-40"
              >
                {fileReady ? `Add to cart · ${formatNaira(price)}` : upload.state.status === "failed" ? "Upload didn't finish" : "Waiting for the upload…"}
              </button>
              <button
                type="button"
                onClick={() => setStep("write")}
                className="h-12 rounded-full border border-oxblood px-8 text-oxblood transition-colors hover:bg-oxblood hover:text-vellum"
              >
                Go back and edit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
