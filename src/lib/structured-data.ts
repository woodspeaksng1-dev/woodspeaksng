import { SITE, absoluteUrl } from "./site";
import { imageSrc } from "./media";
import type { Product } from "./types";

const ORG_ID = absoluteUrl("/#organization");

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: absoluteUrl("/icon.png"),
    image: absoluteUrl("/og.jpg"),
    description: SITE.description,
    slogan: SITE.tagline,
    address: { "@type": "PostalAddress", addressLocality: SITE.city, addressCountry: SITE.country },
    areaServed: { "@type": "Country", name: "Nigeria" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE.phone.replace(/\s/g, ""),
      contactType: "customer service",
      availableLanguage: ["English"],
    },
    sameAs: [SITE.instagram],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE.name,
    url: SITE.url,
    inLanguage: "en-NG",
    publisher: { "@id": ORG_ID },
  };
}

export function productImage(product: Product) {
  return product.image || imageSrc(`products/${product.slug}-cutout`) || imageSrc(`products/${product.slug}`);
}

export function productLd(product: Product) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const images = [productImage(product), ...(product.gallery ?? [])].filter((i): i is string => !!i);
  const madeToOrder = product.personalization.kind !== "none";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description,
    url,
    ...(images.length ? { image: images.map(absoluteUrl) } : {}),
    sku: product.id,
    brand: { "@type": "Brand", name: SITE.name },
    category: product.category,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "NGN",
      price: product.price,
      availability: madeToOrder ? "https://schema.org/MadeToOrder" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ORG_ID },
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
