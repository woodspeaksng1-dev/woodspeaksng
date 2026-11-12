"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import type { Product } from "@/lib/types";
import { BagIcon, PenIcon } from "../ui/icons";

const pill =
  "inline-flex h-10 shrink-0 items-center whitespace-nowrap justify-center gap-2 rounded-full bg-ink text-[0.82rem] text-vellum transition-colors hover:bg-oxblood w-10 sm:w-auto sm:pr-4 sm:pl-3.5";

/** The dark pill on each card: personalise (goes to the product) or add straight to the cart. */
export function CardAction({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  if (product.personalization.kind !== "none") {
    return (
      <Link href={`/products/${product.slug}`} className={pill} aria-label={`Personalise the ${product.name}`}>
        <PenIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Personalise</span>
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => add(product.id)} className={pill} aria-label={`Add the ${product.name} to your cart`}>
      <BagIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Add to cart</span>
    </button>
  );
}
