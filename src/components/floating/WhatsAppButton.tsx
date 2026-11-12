"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CONTACT } from "@/lib/contact";
import { findProductBySlug } from "@/lib/catalog";
import { useCatalog } from "../catalog/CatalogProvider";
import { CloseIcon, WhatsAppIcon } from "../ui/icons";
import { tuckClasses, useTuckOnScroll } from "./useTuckOnScroll";

/** Shown on the shop and product pages only (not the customizer, where it would cover the text box). */
export function WhatsAppButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const catalog = useCatalog();
  const tucked = useTuckOnScroll(!open);

  const onShop = pathname === "/shop" || (pathname.startsWith("/products/") && !pathname.endsWith("/personalise"));
  if (!onShop) return null;

  const product = pathname.startsWith("/products/")
    ? findProductBySlug(catalog, pathname.split("/")[2] ?? "")
    : undefined;
  const message = product
    ? `Hello Woodspeaks, I have a question about the ${product.name}: https://woodspeaks.ng${pathname}`
    : "Hello Woodspeaks, I'd like help choosing a gift.";

  return (
    <div
      className={`fixed right-4 bottom-[calc(1rem+var(--sticky-bar,0px))] z-30 flex flex-col items-end gap-3 md:right-6 md:bottom-6 ${tuckClasses(tucked, "right")}`}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-72 rounded-2xl bg-vellum p-5 shadow-[0_12px_40px_-12px_rgb(42_23_18/0.4)]"
            role="dialog"
            aria-label="Message us on WhatsApp"
          >
            <p className="text-ink">To curate your gift further or for support, send us a message.</p>
            <a
              href={CONTACT.whatsappUrl(message)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-whatsapp font-semibold text-white transition-colors hover:bg-whatsapp-dark"
            >
              <WhatsAppIcon width={20} height={20} />
              Open WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_8px_24px_-8px_rgb(42_23_18/0.5)] transition-colors hover:bg-whatsapp-dark"
        aria-label={open ? "Close WhatsApp message" : "Message us on WhatsApp"}
        aria-expanded={open}
      >
        {open ? <CloseIcon /> : <WhatsAppIcon width={30} height={30} />}
      </button>
    </div>
  );
}
