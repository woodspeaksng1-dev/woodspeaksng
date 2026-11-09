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

/**
 * The customizer: write (or pick a photo) with a live preview, then a final check with a
 * required spelling tick, then add to cart. Text drafts (and a video link) are kept in this
 * tab's session so a refresh doesn't lose them; photos and video files are kept only while
 * the page is open (uploads to private storage arrive with the backend).
 * Rendered on the client only (it reads the saved draft on first render).
 */
export function Customizer({ product }: { product: Product }) {
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
      return photo ? { kind: "photo", photoNames: [photo.name], crop } : "Choose a photo first.";
    }
    if (p.kind === "video") {
      if (draft.videoSource === "file")
        return video ? { kind: "video", source: "file", fileName: video.name, sizeMb: video.sizeMb } : "Choose your video first.";
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
    if (typeof c === "string" || !checked) return;
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
                    setPhoto(next);
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
                    setVideo(next);
                  }}
                  link={draft.videoLink}
                  onLink={(videoLink) => update({ videoLink })}
                  maxMb={p.maxMb}
                  error={videoError}
                  onError={setVideoError}
                />
              )}
            </div>
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
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={!checked}
                onClick={addToCart}
                className="h-12 rounded-full bg-oxblood px-10 text-vellum transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add to cart · {formatNaira(price)}
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
