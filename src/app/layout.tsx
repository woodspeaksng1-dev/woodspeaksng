import type { Metadata, Viewport } from "next";
import "./globals.css";
import { manrope, playfair } from "./fonts";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE } from "@/lib/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { organizationLd, websiteLd } from "@/lib/structured-data";
import { introScript } from "@/components/preloader/intro";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Woodspeaks | Personalised Gifts and Love Scrolls in Lagos",
    template: "%s | Woodspeaks",
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    siteName: SITE.name,
    locale: "en_NG",
    type: "website",
    url: "/",
    title: "Woodspeaks | Gifts that speak louder than words",
    description: SITE.description,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE.url] },
  robots: { index: true, follow: true, "max-image-preview": "large" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#4a1420",
};

// The intro script runs before paint: it skips the intro on repeat views in a visit, and otherwise
// draws the pen as soon as the overlay arrives (see components/preloader/intro.ts).

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`${playfair.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <JsonLd data={[organizationLd(), websiteLd()]} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
