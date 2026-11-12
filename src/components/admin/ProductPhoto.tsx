"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductImage } from "../product/ProductImage";
import { shrinkPhoto } from "./shrink-photo";

/*
 * The product's photo in admin: upload, replace or remove. The browser shrinks the photo first (shrinkPhoto),
 * so a 6 MB phone photo goes up as a few hundred KB, quick on mobile data and light for buyers. The server
 * checks it again and the shop shows it straight away.
 */

export function ProductPhoto({ product }: { product: Product }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async (method: "POST" | "DELETE", body?: Blob) => {
    const res = await fetch(`/api/admin/products/${product.id}/photo`, {
      method,
      body,
      headers: body ? { "Content-Type": body.type } : undefined,
    });
    const result = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setStatus({ ok: res.ok, text: result.message ?? (res.ok ? "Done." : "That didn't work. Try again.") });
    if (res.ok) router.refresh();
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setStatus(null);
    setBusy("upload");
    try {
      await send("POST", await shrinkPhoto(file));
    } catch (error) {
      setStatus({ ok: false, text: error instanceof Error ? error.message : "The photo couldn't be uploaded." });
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async () => {
    if (!window.confirm(`Take the photo off ${product.name}? The shop goes back to the drawn placeholder.`)) return;
    setStatus(null);
    setBusy("remove");
    try {
      await send("DELETE");
    } catch {
      setStatus({ ok: false, text: "That didn't work. Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <ProductImage product={product} className="rounded-xl" />
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => input.current?.click()}
          className="h-10 rounded-full bg-oxblood px-5 text-sm text-vellum transition-colors hover:bg-wine disabled:opacity-50"
        >
          {busy === "upload" ? "Uploading…" : product.image ? "Replace photo" : "Upload a photo"}
        </button>
        {product.image && (
          <button type="button" disabled={busy !== null} onClick={remove} className="text-sm text-ink-soft underline underline-offset-2 disabled:opacity-50">
            {busy === "remove" ? "Removing…" : "Remove photo"}
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-soft">A real photo of the product, upright (4:5) works best.</p>
      {status && (
        <p role="status" className={`mt-2 text-sm ${status.ok ? "text-leaf" : "text-oxblood"}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
