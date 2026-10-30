"use client";

import { useEffect, useRef } from "react";
import type { VideoSource } from "@/lib/media";
import { INTRO_MS } from "../preloader/Preloader";

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
 * visitors are shown that last frame too, so they see the finished state.
 */
export function LoopVideo({
  sources,
  poster,
  label,
  className = "",
  afterIntro = false,
  once = false,
}: {
  sources: VideoSource[];
  poster?: string | null;
  label: string;
  className?: string;
  afterIntro?: boolean;
  once?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (prefersStill()) {
      if (!once) return;
      // Show the finished state: seek to the end once the length is known.
      const toEnd = () => (video.currentTime = Math.max(0, video.duration - 0.05));
      if (video.readyState >= 1) toEnd();
      else video.addEventListener("loadedmetadata", toEnd, { once: true });
      return;
    }
    const firstVisit = document.documentElement.dataset.intro !== "seen";
    let ready = !(afterIntro && firstVisit);
    let visible = false;
    const sync = () => {
      if (once && video.ended) return;
      return ready && visible ? video.play().catch(() => {}) : video.pause();
    };
    const timer = ready ? undefined : window.setTimeout(() => ((ready = true), sync()), INTRO_MS);
    const io = new IntersectionObserver(([e]) => ((visible = e.isIntersecting), sync()), { threshold: 0.25 });
    io.observe(video);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
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
