"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductImage } from "../product/ProductImage";
import { shrinkPhoto } from "./shrink-photo";

/*
 * The product's photos in admin. The main photo (cards, cart, sharing): upload, replace or remove. Up to
 * MAX_EXTRA more, shown after it on the product page: add (several at once), reorder, make one the main
 * photo, or remove. The browser shrinks each photo first (shrinkPhoto), so a 6 MB phone photo goes up as a
 * few hundred KB, quick on mobile data and light for buyers. The server checks it again and the shop shows
 * it straight away.
 */

const MAX_EXTRA = 6; // matches MAX_EXTRA_PHOTOS on the server, which has the final say
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
type Status = { ok: boolean; text: string } | null;
type Move = "up" | "down" | "main" | "remove";

const quiet = "h-9 rounded-full border border-ink/25 px-4 text-sm text-ink transition-colors hover:border-oxblood disabled:opacity-40";

async function call(url: string, init: RequestInit): Promise<{ ok: boolean; text: string }> {
  try {
    const res = await fetch(url, init);
    const result = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: res.ok, text: result.message ?? (res.ok ? "Done." : "That didn't work. Try again.") };
  } catch {
    return { ok: false, text: "That didn't work. Check your connection and try again." };
  }
}

const sendPhoto = async (url: string, file: File) => {
  const body = await shrinkPhoto(file);
  return call(url, { method: "POST", body, headers: { "Content-Type": body.type } });
};

const StatusLine = ({ status }: { status: Status }) =>
  status && (
    <p role="status" className={`mt-2 text-sm ${status.ok ? "text-leaf" : "text-oxblood"}`}>
      {status.text}
    </p>
  );

export function ProductPhoto({ product }: { product: Product }) {
  const router = useRouter();
  const mainInput = useRef<HTMLInputElement>(null);
  const extraInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [extraStatus, setExtraStatus] = useState<Status>(null);
  const extras = product.gallery ?? [];
  const base = `/api/admin/products/${product.id}`;

  const run = async (key: string, show: (s: Status) => void, work: () => Promise<{ ok: boolean; text: string }>) => {
    setStatus(null);
    setExtraStatus(null);
    setBusy(key);
    try {
      const result = await work();
      show(result);
      if (result.ok) router.refresh();
    } catch (error) {
      show({ ok: false, text: error instanceof Error ? error.message : "That didn't work. Try again." });
    } finally {
      setBusy(null);
    }
  };

  const uploadMain = (file: File | undefined) => {
    if (mainInput.current) mainInput.current.value = "";
    if (file) void run("main", setStatus, () => sendPhoto(`${base}/photo`, file));
  };

  const removeMain = () => {
    const next = extras.length ? "The next photo becomes the main one." : "The shop goes back to the drawn placeholder.";
    if (window.confirm(`Take the main photo off ${product.name}? ${next}`))
      void run("remove-main", setStatus, () => call(`${base}/photo`, { method: "DELETE" }));
  };

  // Several photos at once go up one after another; it stops at the first one that's refused.
  const uploadExtras = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (extraInput.current) extraInput.current.value = "";
    if (!files.length) return;
    const room = MAX_EXTRA - extras.length + (product.image ? 0 : 1);
    void run("extra", setExtraStatus, async () => {
      let added = 0;
      for (const file of files.slice(0, room)) {
        setExtraStatus({ ok: true, text: `Uploading ${added + 1} of ${Math.min(files.length, room)}…` });
        const result = await sendPhoto(`${base}/photos`, file);
        if (!result.ok) return added ? { ok: false, text: `${added} added. ${result.text}` } : result;
        added++;
      }
      const skipped = files.length - added;
      return { ok: true, text: `${added === 1 ? "Photo" : `${added} photos`} added.${skipped ? ` ${skipped} left out: a product can have ${MAX_EXTRA} besides the main one.` : ""}` };
    });
  };

  const arrange = (image: string, move: Move) => {
    if (move === "remove" && !window.confirm("Remove this photo from the product?")) return;
    void run(`${move}:${image}`, setExtraStatus, () =>
      call(`${base}/photos`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, move }) }),
    );
  };

  return (
    <div>
      <ProductImage product={product} className="rounded-xl" />
      <input ref={mainInput} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => uploadMain(e.target.files?.[0])} />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => mainInput.current?.click()}
          className="h-10 rounded-full bg-oxblood px-5 text-sm text-vellum transition-colors hover:bg-wine disabled:opacity-50"
        >
          {busy === "main" ? "Uploading…" : product.image ? "Replace main photo" : "Upload a photo"}
        </button>
        {product.image && (
          <button type="button" disabled={busy !== null} onClick={removeMain} className="text-sm text-ink-soft underline underline-offset-2 disabled:opacity-50">
            {busy === "remove-main" ? "Removing…" : "Remove photo"}
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-soft">The main photo shows on cards, in the cart and when the page is shared. A real photo of the product, upright (4:5) works best.</p>
      <StatusLine status={status} />

      <div className="mt-6 border-t border-rule pt-5">
        <h3 className="text-sm font-semibold text-ink">More photos</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Shown after the main photo on the product page: other angles, the packaging, the gift in someone&rsquo;s hands. Up to {MAX_EXTRA}.
        </p>
        {extras.length > 0 && (
          <ol className="mt-3 divide-y divide-rule">
            {extras.map((image, i) => (
              <li key={image} className="flex items-center gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={`Photo ${i + 2}`} className="aspect-[4/5] w-14 shrink-0 rounded-lg object-cover" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy !== null} onClick={() => arrange(image, "main")} className={quiet}>
                    Make main
                  </button>
                  <button type="button" disabled={busy !== null || i === 0} onClick={() => arrange(image, "up")} className={quiet} aria-label={`Move photo ${i + 2} up`}>
                    Move up
                  </button>
                  <button type="button" disabled={busy !== null || i === extras.length - 1} onClick={() => arrange(image, "down")} className={quiet} aria-label={`Move photo ${i + 2} down`}>
                    Move down
                  </button>
                  <button type="button" disabled={busy !== null} onClick={() => arrange(image, "remove")} className="h-9 px-2 text-sm text-oxblood underline underline-offset-2 disabled:opacity-40">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <input ref={extraInput} type="file" accept={ACCEPT} multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => uploadExtras(e.target.files)} />
        <button
          type="button"
          disabled={busy !== null || extras.length >= MAX_EXTRA}
          onClick={() => extraInput.current?.click()}
          className={`${quiet} mt-3 h-10 px-5`}
        >
          {busy === "extra" ? "Uploading…" : extras.length >= MAX_EXTRA ? `${MAX_EXTRA} photos added` : "Add photos"}
        </button>
        <StatusLine status={extraStatus} />
      </div>
    </div>
  );
}
