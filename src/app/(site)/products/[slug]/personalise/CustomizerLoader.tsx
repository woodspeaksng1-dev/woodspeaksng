"use client";

import dynamic from "next/dynamic";
import type { Product } from "@/lib/types";

// Client only: the customizer restores the saved draft from sessionStorage on its first render.
const Customizer = dynamic(() => import("@/components/customizer/Customizer").then((m) => m.Customizer), {
  ssr: false,
  loading: () => <p className="py-24 text-center text-ink-soft">Opening the customizer…</p>,
});

export function CustomizerLoader({ product, uploads }: { product: Product; uploads: boolean }) {
  return <Customizer product={product} uploads={uploads} />;
}
