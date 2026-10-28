"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { imageSrc, videoSources } from "@/lib/media";
import { LoopVideo } from "../media/LoopVideo";
import { HeroScroll } from "./HeroScroll";

/**
 * The centre of the hero: the love scroll unrolling, on its own.
 * hero/product.(webm|mp4) is the client's film with the background removed and the
 * scroll composited onto the page parchment, so it plays everywhere (Safari included)
 * with no visible box. A soft feathered edge hides any colour drift between the video
 * and the page. It plays once and rests open. The drawn scroll stands in without it.
 */
export function HeroStage() {
  const film = videoSources("hero/product");
  const still = imageSrc("hero/product");
  const reduce = useReducedMotion();
  const [delay, setDelay] = useState<number | null>(null);

  // Enter after the preloader on a first visit; straight away on repeat views.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setDelay(document.documentElement.dataset.intro === "seen" ? 0.1 : 1.9),
    );
    return () => cancelAnimationFrame(id);
  }, []);
  const go = delay !== null;

  return (
    <div className="relative aspect-[53/50] w-full">
      {/* Contact shadow: the scroll hangs just above the page. */}
      <div aria-hidden className="absolute bottom-[1%] left-1/2 h-[5%] w-[60%] -translate-x-1/2 rounded-[50%] bg-ink/20 blur-xl" />

      <motion.div
        className="absolute inset-0"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={go ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: delay ?? 0, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {film.length > 0 ? (
          <LoopVideo
            sources={film}
            poster={still}
            label="A Woodspeaks love scroll unrolling to show a handwritten letter"
            className="h-full w-full object-contain [mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent),linear-gradient(transparent,black_4%,black_96%,transparent)] [mask-composite:intersect]"
            afterIntro
            once
          />
        ) : (
          <div className="mx-auto h-full w-[80%] pt-[4%]">
            <HeroScroll />
          </div>
        )}
      </motion.div>
    </div>
  );
}
