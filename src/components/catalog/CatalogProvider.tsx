"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Catalog } from "@/lib/types";

/*
 * The live catalog for browser components (cart, checkout, shop filters, Mudi…). The site layout reads it
 * on the server (`getStorefront()`) and hands it down here, so nothing in the browser imports catalog data.
 * Prices shown from it are for display; the server prices every order itself.
 */
const CatalogContext = createContext<Catalog | null>(null);

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export function useCatalog(): Catalog {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("useCatalog() needs a <CatalogProvider> above it.");
  return catalog;
}
