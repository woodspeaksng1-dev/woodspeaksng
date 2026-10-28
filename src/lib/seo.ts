import type { Metadata } from "next";
import { SITE } from "./site";

export const DEFAULT_OG_IMAGE = { url: "/og.jpg", width: 1200, height: 630, alt: "A Woodspeaks love scroll, open, with its wax seal" };

/**
 * Page metadata with a canonical URL and complete share tags. Next replaces the
 * whole `openGraph` object per page, so every page goes through here to keep the
 * site name, locale and share image.
 */
export function pageMeta({
  title,
  description,
  path,
  image,
  ogTitle,
}: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; alt: string } | null;
  ogTitle?: string;
}): Metadata {
  const images = [image ?? DEFAULT_OG_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      siteName: SITE.name,
      locale: "en_NG",
      type: "website",
      url: path,
      title: ogTitle ?? `${title} | ${SITE.name}`,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title: ogTitle ?? `${title} | ${SITE.name}`, description, images: images.map((i) => i.url) },
  };
}
