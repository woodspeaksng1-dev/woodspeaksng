import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { MOMENTS } from "@/lib/gallery";
import { MomentMedia } from "@/components/media/MomentMedia";

export const metadata: Metadata = pageMeta({
  title: "About us",
  description:
    "Woodspeaks turns emotions, memories and meaningful messages into handcrafted gifts that last a lifetime. Made by hand in Lagos.",
  path: "/about",
});

// Copy from the client's asset list (22 Oct 2026). "Our story" and
// "What inspires us" are waiting on the client's own text.
export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-8 pb-28 sm:px-6">
      <h1 className="text-5xl text-ink md:text-6xl">About us</h1>
      <p className="mt-8 font-display text-2xl leading-snug text-ink md:text-3xl">
        Woodspeaks helps people express feelings that are often difficult to put into words.
      </p>
      <p className="mt-6 text-lg text-ink-soft">
        Through personalised vintage scrolls and luxury keepsakes, we transform emotions, memories and
        meaningful messages into tangible gifts that last a lifetime. We make it easier to communicate love,
        appreciation, gratitude and commitment in a way that is unique and unforgettable.
      </p>

      <section className="mt-16 border-t border-rule pt-10" aria-labelledby="our-story">
        <h2 id="our-story" className="text-3xl text-oxblood">
          Our story
        </h2>
        <p className="mt-4 text-ink-soft">Text to come from Woodspeaks.</p>
      </section>

      <section className="mt-12 border-t border-rule pt-10" aria-labelledby="inspires">
        <h2 id="inspires" className="text-3xl text-oxblood">
          What inspires us
        </h2>
        <p className="mt-4 text-ink-soft">Text to come from Woodspeaks.</p>
      </section>

      <section className="mt-12 border-t border-rule pt-10" aria-labelledby="gallery">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="gallery" className="text-3xl text-oxblood">
            Gallery
          </h2>
          <Link href="/about/gallery" className="text-oxblood underline decoration-gold/60 underline-offset-4 hover:decoration-oxblood">
            See the gallery
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-3 gap-3">
          {MOMENTS.slice(0, 3).map((m, i) => (
            <li key={m.id} className="rounded-[1.2rem] bg-vellum p-1.5 shadow-card">
              <MomentMedia mediaKey={`gallery/${m.id}`} label={m.caption} tone={i} className="aspect-[4/5] rounded-[0.9rem]" />
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
