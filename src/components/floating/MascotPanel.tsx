"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { OCCASION_LABELS, PRODUCTS, RECIPIENT_LABELS } from "@/lib/catalog";
import { formatNaira } from "@/lib/format";
import type { Occasion, Product, Recipient } from "@/lib/types";
import { CloseIcon, WizardHatIcon } from "../ui/icons";
import { Chips } from "../ui/Chips";
import { imageSrc } from "@/lib/media";

const wizard = imageSrc("mascot/wizard");

type View = "home" | "suggest" | "results";

const NUDGE_FIRST_MS = 6000; // after the preloader has cleared
const NUDGE_SHOW_MS = 4000;
const NUDGE_EVERY_MS = 20000;
const NUDGE_KEY = "ws-wizard-opened";

function pickSuggestions(recipient: Recipient, occasion: Occasion, count = 3): Product[] {
  const sellable = PRODUCTS.filter((p) => !p.addOn);
  const matches = sellable.filter((p) => p.recipients.includes(recipient) && p.occasions.includes(occasion));
  const pool = matches.length >= count ? matches : [...matches, ...sellable.filter((p) => p.featured && !matches.includes(p))];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * The wizard mascot. Opens only when tapped (no auto pop-up); until it has been opened this session,
 * a small "Click me" bubble appears beside it at intervals. Hidden during checkout.
 * "Suggest a gift" works now from catalog tags. "Write my message" lives in the
 * customizer, where its drafts drop straight into the text box (built next).
 */
export function MascotPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [nudge, setNudge] = useState(false);
  const [opened, setOpened] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(NUDGE_KEY)) return;
    } catch {}
    if (opened) return;
    let hide = 0;
    const show = () => {
      setNudge(true);
      hide = window.setTimeout(() => setNudge(false), NUDGE_SHOW_MS);
    };
    let repeat = 0;
    const first = window.setTimeout(() => {
      show();
      repeat = window.setInterval(show, NUDGE_EVERY_MS);
    }, NUDGE_FIRST_MS);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(hide);
      window.clearInterval(repeat);
    };
  }, [opened]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    if (open) reset();
    else {
      setNudge(false);
      setOpened(true);
      try {
        sessionStorage.setItem(NUDGE_KEY, "1");
      } catch {}
    }
    setOpen((o) => !o);
  };

  const reset = () => {
    setView("home");
    setRecipient(null);
    setOccasion(null);
    setResults([]);
  };

  // Nothing floats over the checkout form.
  if (pathname.startsWith("/checkout")) return null;

  return (
    <div className="fixed bottom-[calc(1rem+var(--sticky-bar,0px))] left-4 z-30 flex flex-col items-start gap-3 md:bottom-6 md:left-6">
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-label="Woodspeaks gift wizard"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="max-h-[70dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-vellum p-5 shadow-[0_16px_48px_-16px_rgb(42_23_18/0.45)] outline-none"
          >
            {view === "home" && (
              <>
                <div className="flex items-center gap-3">
                  {wizard && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wizard} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover object-[50%_25%] ring-1 ring-rule" />
                  )}
                  <p className="font-display text-xl leading-snug text-oxblood">Hello, I&rsquo;m the Woodspeaks wizard.</p>
                </div>
                <p className="mt-2 text-ink">
                  I can suggest a gift, or help you write the perfect message when you personalise one.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setView("suggest")}
                    className="h-11 rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine"
                  >
                    Suggest a gift
                  </button>
                  <Link
                    href="/shop?personalised=1"
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-center rounded-full border border-oxblood text-oxblood transition-colors hover:bg-oxblood hover:text-vellum"
                  >
                    Write my message
                  </Link>
                </div>
              </>
            )}

            {view === "suggest" && (
              <>
                <p className="font-display text-xl text-oxblood">Who is it for?</p>
                <Chips label="Recipient" options={RECIPIENT_LABELS} value={recipient} onChange={setRecipient} />
                <Chips label="Occasion" options={OCCASION_LABELS} value={occasion} onChange={setOccasion} />
                <button
                  type="button"
                  disabled={!recipient || !occasion}
                  onClick={() => {
                    if (!recipient || !occasion) return;
                    setResults(pickSuggestions(recipient, occasion));
                    setView("results");
                  }}
                  className="mt-6 h-11 w-full rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Show me gifts
                </button>
              </>
            )}

            {view === "results" && (
              <>
                <p className="font-display text-xl text-oxblood">Three I think they&rsquo;d love</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {results.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/products/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-rule px-4 py-3 transition-colors hover:border-oxblood"
                      >
                        <span className="font-display text-lg leading-snug">{p.name}</span>
                        <span className="shrink-0 text-sm text-ink-soft tabular-nums">{formatNaira(p.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-4 text-sm">
                  <button
                    type="button"
                    onClick={() => recipient && occasion && setResults(pickSuggestions(recipient, occasion))}
                    className="text-oxblood underline underline-offset-2"
                  >
                    Show three more
                  </button>
                  <button type="button" onClick={reset} className="text-ink-soft underline underline-offset-2">
                    Start again
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <button
          type="button"
          onClick={toggle}
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-oxblood-deep text-gold-light shadow-[0_8px_24px_-8px_rgb(42_23_18/0.5)] ring-2 ring-gold-light/60 transition-transform hover:-translate-y-0.5"
          aria-label={open ? "Close the gift wizard" : "Open the gift wizard"}
          aria-expanded={open}
        >
          {open ? (
            <CloseIcon />
          ) : wizard ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wizard} alt="" className="h-full w-full scale-[1.35] object-cover object-[50%_22%]" />
          ) : (
            <WizardHatIcon width={30} height={30} />
          )}
        </button>
        <AnimatePresence>
          {nudge && !open && (
            <motion.button
              type="button"
              onClick={toggle}
              initial={reduceMotion ? false : { opacity: 0, x: -6, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: -6, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              aria-hidden="true"
              tabIndex={-1}
              className="absolute top-1/2 left-full ml-3 -translate-y-1/2 whitespace-nowrap rounded-full rounded-bl-sm bg-vellum px-3.5 py-1.5 text-sm text-oxblood shadow-[0_8px_24px_-10px_rgb(42_23_18/0.45)] ring-1 ring-rule"
            >
              Click me
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
