import type { Metadata, Viewport } from "next";
import "./globals.css";
import { manrope, playfair } from "./fonts";
import { Preloader } from "@/components/preloader/Preloader";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MascotPanel } from "@/components/floating/MascotPanel";
import { WhatsAppButton } from "@/components/floating/WhatsAppButton";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE } from "@/lib/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { organizationLd, websiteLd } from "@/lib/structured-data";

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

// Runs before paint: skip the intro on repeat views in the same session.
const introScript = `try{if(sessionStorage.getItem('ws-intro'))document.documentElement.dataset.intro='seen'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`${playfair.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <JsonLd data={[organizationLd(), websiteLd()]} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <Preloader />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-oxblood focus:px-4 focus:py-2 focus:text-vellum"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <CartDrawer />
        <MascotPanel />
        <WhatsAppButton />
      </body>
    </html>
  );
}
