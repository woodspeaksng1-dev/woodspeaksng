"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * Buy buttons. Personalised products get "Personalise" (the customizer is the
 * next build step); plain products add straight to the cart.
 * On phones the button sits in a sticky bar at the bottom of the screen.
 */
export function AddToCart({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const personalisable = product.personalization.kind !== "none";

  // Lift the floating buttons above the sticky bar on phones.
  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty("--sticky-bar", "76px");
    return () => {
      html.style.removeProperty("--sticky-bar");
    };
  }, []);

  const button = personalisable ? (
    <button
      type="button"
      disabled
      title="The customizer is being built next"
      className="h-12 w-full rounded-full bg-oxblood text-vellum opacity-60 md:w-auto md:px-10"
    >
      Personalise
    </button>
  ) : (
    <button
      type="button"
      onClick={() => add(product.id)}
      className="h-12 w-full rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine md:w-auto md:px-10"
    >
      Add to cart
    </button>
  );

  return (
    <>
      <div className="mt-10 hidden md:block">{button}</div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-4 border-t border-rule bg-vellum/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <span className="font-display text-xl tabular-nums">{formatNaira(product.price)}</span>
        <div className="flex-1">{button}</div>
      </div>
    </>
  );
}
