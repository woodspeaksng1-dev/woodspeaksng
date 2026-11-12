"use client";

import { useEffect, useRef } from "react";
import type { VideoSource } from "@/lib/media";
import { onIntroDone } from "../preloader/intro";

/** True when the visitor asked for less motion or is saving mobile data. */
export function prefersStill() {
  if (typeof window === "undefined") return true;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return reduced || Boolean(conn?.saveData);
}

/**
 * A muted, looping clip that only plays while on screen. Visitors who prefer
 * reduced motion or have data saver on see the poster image instead.
 * `afterIntro` holds the first play until the preloader has finished, and loads the whole clip
 * meanwhile so it doesn't stall on mobile data when it starts.
 * `once` plays through a single time and rests on the last frame; still-preferring
 * visitors are shown that last frame too, so they see the finished state. So are visitors
 * whose browser refuses to autoplay (Safari in Low Power Mode or with Auto-Play off).
 * `onFinished` (with `once`) is called when it comes to rest on the last frame, however it got there.
 */
export function LoopVideo({
  sources,
  poster,
  label,
  className = "",
  afterIntro = false,
  once = false,
  onFinished,
}: {
  sources: VideoSource[];
  poster?: string | null;
  label: string;
  className?: string;
  afterIntro?: boolean;
  once?: boolean;
  onFinished?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const finished = useRef(onFinished);
  useEffect(() => {
    finished.current = onFinished;
  });

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // React leaves `muted` out of the server HTML; Safari only autoplays muted video.
    video.muted = video.defaultMuted = true;
    // Show the finished state: seek to the end once the length is known.
    const showEnd = () => {
      const toEnd = () => {
        video.currentTime = Math.max(0, video.duration - 0.05);
        finished.current?.();
      };
      if (video.readyState >= 1) toEnd();
      else video.addEventListener("loadedmetadata", toEnd, { once: true });
    };
    if (prefersStill()) {
      if (once) showEnd();
      return;
    }
    const onEnded = () => finished.current?.();
    if (once) video.addEventListener("ended", onEnded);
    let ready = !afterIntro;
    let visible = false;
    const sync = () => {
      if (once && video.ended) return;
      // Only a refusal to autoplay skips to the end; a play interrupted by scrolling away (AbortError) just waits.
      return ready && visible ? video.play().catch((e: unknown) => once && (e as Error)?.name === "NotAllowedError" && showEnd()) : video.pause();
    };
    const stopWaiting = afterIntro ? onIntroDone(() => ((ready = true), sync())) : () => {};
    const io = new IntersectionObserver(([e]) => ((visible = e.isIntersecting), sync()), { threshold: 0.25 });
    io.observe(video);
    return () => {
      io.disconnect();
      stopWaiting();
      video.removeEventListener("ended", onEnded);
    };
  }, [afterIntro, once]);

  return (
    <video
      ref={ref}
      className={className}
      poster={poster ?? undefined}
      muted
      loop={!once}
      playsInline
      preload={afterIntro ? "auto" : "metadata"}
      aria-label={label}
    >
      {sources.map((s) => (
        <source key={s.src} src={s.src} type={s.type} />
      ))}
    </video>
  );
}
