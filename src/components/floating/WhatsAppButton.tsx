"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CONTACT } from "@/lib/contact";
import { getProductBySlug } from "@/lib/catalog";
import { ChatIcon, CloseIcon } from "../ui/icons";

/** Shown on the shop and product pages only. Sits bottom-right, clear of buy buttons. */
export function WhatsAppButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const onShop = pathname === "/shop" || pathname.startsWith("/products/");
  if (!onShop) return null;

  const product = pathname.startsWith("/products/")
    ? getProductBySlug(pathname.split("/")[2] ?? "")
    : undefined;
  const message = product
    ? `Hello Woodspeaks, I have a question about the ${product.name}: https://woodspeaks.ng${pathname}`
    : "Hello Woodspeaks, I'd like help choosing a gift.";

  return (
    <div className="fixed right-4 bottom-[calc(1rem+var(--sticky-bar,0px))] z-30 flex flex-col items-end gap-3 md:right-6 md:bottom-6">
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
              className="mt-4 flex h-11 items-center justify-center rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine"
            >
              Open WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-oxblood text-vellum shadow-[0_8px_24px_-8px_rgb(42_23_18/0.5)] transition-colors hover:bg-wine"
        aria-label={open ? "Close WhatsApp message" : "Message us on WhatsApp"}
        aria-expanded={open}
      >
        {open ? <CloseIcon /> : <ChatIcon width={26} height={26} />}
      </button>
    </div>
  );
}
