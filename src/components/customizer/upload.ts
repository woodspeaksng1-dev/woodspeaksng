"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHUNK_BYTES, type UploadKind } from "@/lib/uploads";

/*
 * Sends one customer file to private storage: our server opens the upload, then the file goes straight to
 * Google in 8 MB pieces. A dropped connection (common on mobile data) waits, asks how much arrived, and
 * carries on from there instead of starting again.
 */

export type UploadState =
  | { status: "idle" }
  | { status: "uploading"; fraction: number }
  | { status: "done"; id: string }
  | { status: "failed"; message: string };

class UploadError extends Error {}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

const waitForOnline = (signal: AbortSignal) =>
  navigator.onLine
    ? Promise.resolve()
    : new Promise<void>((resolve, reject) => {
        const on = () => (window.removeEventListener("online", on), resolve());
        window.addEventListener("online", on);
        signal.addEventListener("abort", () => (window.removeEventListener("online", on), reject(signal.reason)), { once: true });
      });

/** One piece, with progress. Resolves with the status (0 on a network error). */
function putPiece(url: string, body: Blob, range: string, onBytes: (n: number) => void, signal: AbortSignal) {
  return new Promise<number>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Range", range);
    xhr.upload.onprogress = (e) => onBytes(e.loaded);
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0);
    xhr.ontimeout = () => resolve(0);
    xhr.timeout = 120_000;
    signal.addEventListener("abort", () => (xhr.abort(), reject(signal.reason)), { once: true });
    xhr.send(body);
  });
}

async function progressOf(id: string, signal: AbortSignal): Promise<{ received: number; done: boolean }> {
  const res = await fetch(`/api/uploads/${id}`, { cache: "no-store", signal });
  if (res.status === 404) throw new UploadError("The upload expired. Choose the file again.");
  if (!res.ok) throw new Error(`progress ${res.status}`);
  return res.json();
}

async function uploadFile(file: File, productId: string, kind: UploadKind, onFraction: (f: number) => void, signal: AbortSignal) {
  const start = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, kind, contentType: file.type, size: file.size }),
    signal,
  });
  const opened = (await start.json().catch(() => ({}))) as { id?: string; url?: string; message?: string };
  if (!start.ok || !opened.id || !opened.url) throw new UploadError(opened.message ?? "We couldn't start the upload.");
  const { id, url } = opened;

  let offset = 0;
  let failures = 0;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_BYTES, file.size);
    const from = offset;
    const status = await putPiece(url, file.slice(from, end), `bytes ${from}-${end - 1}/${file.size}`, (n) => onFraction((from + n) / file.size), signal);
    if (status === 200 || status === 201) return id;
    if (status === 308) {
      failures = 0;
      // Google may keep less than it was sent; ask how much it has rather than assume.
      const p = await progressOf(id, signal);
      if (p.done) return id;
      offset = p.received;
    } else {
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) throw new UploadError("The upload was refused. Choose the file again.");
      if (++failures > 8) throw new UploadError("The connection keeps dropping.");
      await waitForOnline(signal);
      await sleep(Math.min(30_000, 1000 * 2 ** failures), signal);
      const p = await progressOf(id, signal).catch(() => null);
      if (p?.done) return id;
      if (p) offset = p.received;
    }
    onFraction(offset / file.size);
  }
  return id;
}

/** Upload state for one file slot. `start` replaces whatever was uploading; `retry` sends the same file again. */
export function useUpload(productId: string, kind: UploadKind, enabled: boolean) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const lastFile = useRef<File | null>(null);

  const start = useCallback(
    (file: File) => {
      if (!enabled) return;
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      lastFile.current = file;
      setState({ status: "uploading", fraction: 0 });
      uploadFile(file, productId, kind, (fraction) => !c.signal.aborted && setState({ status: "uploading", fraction }), c.signal).then(
        (id) => !c.signal.aborted && setState({ status: "done", id }),
        (error) => {
          if (c.signal.aborted) return;
          setState({
            status: "failed",
            message: error instanceof UploadError ? error.message : "The upload didn't finish. Check your connection and try again.",
          });
        },
      );
    },
    [enabled, productId, kind],
  );

  const retry = useCallback(() => lastFile.current && start(lastFile.current), [start]);

  useEffect(() => () => controller.current?.abort(), []);
  return { state, start, retry };
}
