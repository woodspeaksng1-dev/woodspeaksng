"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cartSubtotal, lineTotal, useCart } from "@/lib/cart-store";
import { findProduct } from "@/lib/catalog";
import { useCatalog } from "../catalog/CatalogProvider";
import { formatNaira } from "@/lib/format";
import type { CartItem } from "@/lib/types";
import { CloseIcon, MinusIcon, PlusIcon } from "../ui/icons";
import { ProductImage } from "../product/ProductImage";

function customizationSummary(item: CartItem) {
  const c = item.customization;
  if (c.kind === "letter") return `“${c.text.slice(0, 60)}${c.text.length > 60 ? "…" : ""}”`;
  if (c.kind === "reasons") return c.mode === "custom" ? "Your own 20 reasons" : "Our 20 reasons";
  if (c.kind === "photo") return c.photoNames.length ? "Photo added" : "Photo still needed";
  if (c.kind === "video") return c.source === "file" ? `Video: ${c.fileName}` : "Video link added";
  return null;
}

export function CartDrawer() {
  const { items, isOpen, close, remove, setQuantity } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const catalog = useCatalog();
  const subtotal = cartSubtotal(items, catalog.products);

  // Restore the saved cart after the first render (avoids a server/client mismatch).
  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="absolute inset-y-0 right-0 flex w-full flex-col bg-vellum shadow-[-24px_0_48px_-24px_rgb(42_23_18/0.35)] sm:w-[420px]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
          >
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h2 id="cart-title" className="text-2xl text-oxblood">
                Your cart
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-parchment"
                aria-label="Close cart"
              >
                <CloseIcon />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <p className="font-display text-xl text-ink">Nothing in your cart yet.</p>
                <p className="text-ink-soft">Find a gift that says what you mean.</p>
                <Link
                  href="/shop"
                  onClick={close}
                  className="rounded-full bg-oxblood px-6 py-3 text-vellum transition-colors hover:bg-wine"
                >
                  Browse the shop
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-rule overflow-y-auto px-5">
                  {items.map((item) => {
                    const product = findProduct(catalog, item.productId);
                    if (!product) return null;
                    const summary = customizationSummary(item);
                    return (
                      <li key={item.lineId} className="flex gap-4 py-5">
                        <ProductImage product={product} className="w-20 shrink-0 rounded-xl [&_span]:text-xs" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={`/products/${product.slug}`}
                              onClick={close}
                              className="font-display text-lg leading-snug hover:text-oxblood"
                            >
                              {product.name}
                            </Link>
                            <span className="shrink-0 tabular-nums">{formatNaira(lineTotal(item, catalog.products))}</span>
                          </div>
                          {summary && (
                            <p className="truncate text-sm text-ink-soft">
                              {summary}{" "}
                              <Link
                                href={`/products/${product.slug}`}
                                onClick={close}
                                className="text-oxblood underline underline-offset-2"
                              >
                                Edit
                              </Link>
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center rounded-full border border-rule">
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center"
                                onClick={() => setQuantity(item.lineId, item.quantity - 1)}
                                aria-label={`Decrease quantity of ${product.name}`}
                              >
                                <MinusIcon width={16} height={16} />
                              </button>
                              <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center"
                                onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                                aria-label={`Increase quantity of ${product.name}`}
                              >
                                <PlusIcon width={16} height={16} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(item.lineId)}
                              className="text-sm text-ink-soft underline underline-offset-2 hover:text-oxblood"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t border-rule px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <div className="flex items-baseline justify-between">
                    <span>Subtotal</span>
                    <span className="font-display text-xl tabular-nums">{formatNaira(subtotal)}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">Delivery is calculated at checkout.</p>
                  <Link
                    href="/checkout"
                    onClick={close}
                    className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine"
                  >
                    Checkout
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-3 w-full py-2 text-sm text-ink-soft underline underline-offset-2"
                  >
                    Continue shopping
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
