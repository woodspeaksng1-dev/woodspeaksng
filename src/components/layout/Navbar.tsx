"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Wordmark } from "./Wordmark";
import { BagIcon, CloseIcon, MenuIcon, UserIcon } from "../ui/icons";
import { cartCount, useCart } from "@/lib/cart-store";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.open);
  const count = cartCount(items);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on Escape (links close it on click).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,box-shadow] duration-300 ${
        scrolled || menuOpen
          ? "bg-parchment/95 shadow-[0_1px_0_var(--color-rule)] backdrop-blur-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto] items-center px-4 sm:px-6 md:h-20 md:grid-cols-[1fr_auto_1fr] lg:px-10">
        <Wordmark className="justify-self-start text-oxblood" />

        <ul className="hidden items-center gap-10 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-2 text-[0.95rem] transition-colors hover:text-oxblood ${
                    active ? "text-oxblood" : "text-ink"
                  }`}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-0.5 h-px bg-gold" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1 justify-self-end">
          <Link
            href="/account"
            className="hidden h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:text-oxblood md:flex"
            aria-label="Your account"
          >
            <UserIcon />
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:text-oxblood"
            aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
          >
            <BagIcon />
            {count > 0 && (
              <span className="absolute top-1.5 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-oxblood px-1 text-[0.68rem] font-semibold text-vellum tabular-nums">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="border-t border-rule bg-parchment px-4 pt-2 pb-8 md:hidden"
          >
            <ul className="flex flex-col">
              {[...LINKS, { href: "/account", label: "Your account" }].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-rule py-4 font-display text-2xl text-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
