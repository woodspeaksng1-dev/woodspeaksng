import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";
import { productImage } from "@/lib/structured-data";

/**
 * Only pages with real content are listed. Add /corporate, /faq and the policy pages
 * here when they stop being "coming soon" (and remove their noindex).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about/gallery"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.4 },
  ];
  const products: MetadataRoute.Sitemap = PRODUCTS.map((p) => {
    const image = productImage(p);
    return {
      url: absoluteUrl(`/products/${p.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
      ...(image ? { images: [absoluteUrl(image)] } : {}),
    };
  });
  return [...pages, ...products];
}
