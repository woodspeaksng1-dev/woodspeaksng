import type { ReactNode } from "react";
import { CatalogProvider } from "@/components/catalog/CatalogProvider";
import { getStorefront } from "@/lib/server/catalog";
import { SiteChrome } from "./SiteChrome";

/** Shop pages' frame: the live catalog for browser components, plus the navbar, footer, cart and helpers. */
export async function ShopFrame({ children }: { children: ReactNode }) {
  const catalog = await getStorefront();
  return (
    <CatalogProvider catalog={catalog}>
      <SiteChrome>{children}</SiteChrome>
    </CatalogProvider>
  );
}
