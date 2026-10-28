"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoSource } from "@/lib/media";
import { PlayIcon } from "../ui/icons";
import { prefersStill } from "./LoopVideo";

/**
 * A photo that turns into its video: on hover or keyboard focus with a mouse,
 * and when mostly on screen on touch phones (there's no hover there).
 * Reduced-motion and data-saver visitors keep the still photo.
 */
export function HoverVideo({
  sources,
  poster,
  label,
  className = "",
  active,
}: {
  sources: VideoSource[];
  poster?: string | null;
  label: string;
  className?: string;
  /** Lets a parent (e.g. a card) drive play state from its own hover. */
  active?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // Touch screens: play while at least 70% visible.
  useEffect(() => {
    const video = ref.current;
    if (!video || prefersStill() || window.matchMedia("(hover: hover)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => (e.intersectionRatio >= 0.7 ? video.play().catch(() => {}) : video.pause()),
      { threshold: [0, 0.7] },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  // Mouse screens: follow the parent's hover state.
  useEffect(() => {
    const video = ref.current;
    if (!video || active === undefined || prefersStill()) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (active) video.play().catch(() => {});
    else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active]);

  return (
    <>
      <video
        ref={ref}
        className={className}
        poster={poster ?? undefined}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        {sources.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
      <span
        aria-hidden
        className={`pointer-events-none absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-vellum/90 text-ink shadow-sm transition-opacity duration-300 ${
          playing ? "opacity-0" : "opacity-100"
        }`}
      >
        <PlayIcon className="h-3.5 w-3.5" />
      </span>
    </>
  );
}
