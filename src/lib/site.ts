import { CONTACT } from "./contact";

/**
 * One place for the site's public identity, used by metadata, the sitemap,
 * robots.txt and structured data. Set NEXT_PUBLIC_SITE_URL on Vercel if the
 * final domain differs (the current live site answers on www.woodspeaks.ng).
 */
export const SITE = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.woodspeaks.ng").replace(/\/$/, ""),
  name: "Woodspeaks",
  legalName: "Woodspeaks Limited",
  tagline: "Gifts that speak louder than words",
  description:
    "Handwritten love scrolls, personalised puzzles, lockets and keepsakes, made by hand and delivered in Lagos. Write your own words, or let us help.",
  city: "Lagos",
  country: "NG",
  phone: CONTACT.phoneDisplay,
  instagram: CONTACT.instagramUrl,
} as const;

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
