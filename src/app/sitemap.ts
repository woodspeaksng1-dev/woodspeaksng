import type { MetadataRoute } from "next";
import { getStorefront } from "@/lib/server/catalog";
import { POLICIES, type PolicySlug } from "@/lib/policies";
import { absoluteUrl } from "@/lib/site";
import { productImage } from "@/lib/structured-data";

/**
 * Only indexable pages are listed. Policy pages join when Woodspeaks approves them
 * (set `draft: false` in src/lib/policies.ts). Checkout, account and the customizer stay out.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products: live } = await getStorefront();
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about/gallery"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/corporate"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/faq"), changeFrequency: "monthly", priority: 0.4 },
  ];
  const policies: MetadataRoute.Sitemap = (Object.keys(POLICIES) as PolicySlug[])
    .filter((slug) => !POLICIES[slug].draft)
    .map((slug) => ({ url: absoluteUrl(`/policies/${slug}`), changeFrequency: "yearly", priority: 0.2 }));
  const products: MetadataRoute.Sitemap = live.map((p) => {
    const image = productImage(p);
    return {
      url: absoluteUrl(`/products/${p.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
      ...(image ? { images: [absoluteUrl(image)] } : {}),
    };
  });
  return [...pages, ...policies, ...products];
}
