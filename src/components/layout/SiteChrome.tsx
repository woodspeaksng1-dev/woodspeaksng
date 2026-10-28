import type { ReactNode } from "react";
import { Preloader } from "@/components/preloader/Preloader";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MascotPanel } from "@/components/floating/MascotPanel";
import { WhatsAppButton } from "@/components/floating/WhatsAppButton";

/** Everything around a shop page: intro, navbar, footer, cart and the floating helpers. Not used by /admin. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
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
    </>
  );
}
