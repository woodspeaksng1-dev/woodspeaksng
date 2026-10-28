"use client";

import { imageSrc, videoSources } from "@/lib/media";
import { HoverVideo } from "./HoverVideo";

const TONES = ["from-blush/70 to-dusk/80", "from-parchment to-sand", "from-vellum to-blush", "from-parchment to-sage"];

/**
 * A customer photo, or its clip when one exists (plays on hover / when on screen).
 * Falls back to a toned placeholder until the real media is in public/media.
 */
export function MomentMedia({
  mediaKey,
  label,
  active,
  tone = 0,
  className = "",
}: {
  mediaKey: string;
  label: string;
  active?: boolean;
  tone?: number;
  className?: string;
}) {
  const poster = imageSrc(mediaKey);
  const video = videoSources(mediaKey);
  const fill = "absolute inset-0 h-full w-full object-cover";

  return (
    <div className={`relative overflow-hidden bg-parchment ${className}`}>
      {video.length > 0 ? (
        <HoverVideo sources={video} poster={poster} label={label} active={active} className={fill} />
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt={label} loading="lazy" className={`${fill} transition-transform duration-700 ease-quill group-hover:scale-[1.03]`} />
      ) : (
        <div className={`${fill} flex items-end bg-gradient-to-b p-4 ${TONES[tone % TONES.length]}`}>
          <span className="font-display text-sm text-ink/60 italic">Customer photo or clip</span>
        </div>
      )}
    </div>
  );
}
