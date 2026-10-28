import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { MOMENTS } from "@/lib/gallery";
import { GalleryCard } from "./GalleryCard";

export const metadata: Metadata = pageMeta({
  title: "Gallery",
  description: "Moments Woodspeaks customers have shared: love scrolls unrolled, letters read aloud and gifts received.",
  path: "/about/gallery",
  image: { url: "/media/gallery/m02.webp", alt: "A customer smiling as she unrolls her Woodspeaks love scroll" },
});

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-28 sm:px-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link href="/about" className="hover:text-oxblood">
          About us
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span aria-current="page">Gallery</span>
      </nav>
      <h1 className="mt-4 text-5xl text-ink md:text-6xl">Gallery</h1>
      <p className="mt-4 max-w-lg text-ink-soft">
        Moments our customers have shared with us. Hover over a card with a clip to play it.
      </p>
      <ul className="mt-12 columns-2 gap-4 sm:gap-6 md:columns-3">
        {MOMENTS.map((m, i) => (
          <li key={m.id} className="mb-4 break-inside-avoid sm:mb-6">
            <GalleryCard moment={m} tone={i} />
          </li>
        ))}
      </ul>
    </div>
  );
}
