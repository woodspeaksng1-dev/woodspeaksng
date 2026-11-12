"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { OCCASION_LABELS, RECIPIENT_LABELS } from "@/lib/catalog";
import { useCatalog } from "../catalog/CatalogProvider";
import { formatNaira } from "@/lib/format";
import type { Occasion, Product, Recipient } from "@/lib/types";
import { CloseIcon, WizardHatIcon } from "../ui/icons";
import { Chips } from "../ui/Chips";
import { imageSrc } from "@/lib/media";
import { tuckClasses, useTuckOnScroll } from "./useTuckOnScroll";
import { onIntroDone } from "../preloader/intro";
import { onHeroDone } from "../home/hero-done";

const mudi = imageSrc("mascot/mudi");

type View = "home" | "suggest" | "results";

const NUDGE_FIRST_MS = 20000; // after Mudi's hello
const NUDGE_SHOW_MS = 4000;
const NUDGE_EVERY_MS = 20000;
const NUDGE_KEY = "ws-wizard-opened";

const HELLO_KEY = "ws-mudi-hello";
const HELLO_TEXT =
  "Hello, I\u2019m Mudi. I can help with gift suggestions, and even write you a thoughtful message. If you need me, I\u2019ll be right here.";
const HELLO_AFTER_MS = 600; // pause after the scroll has dropped (or the intro, away from home)
const HELLO_HERO_FALLBACK_MS = 9000; // if the film never finishes (scrolled away, slow data)
const HELLO_SHOW_MS = 9000; // time to read it, counted from when the last word appears
const HELLO_WORD_MS = 55;

/** Mudi's hello: "waiting" for the scroll to drop, "on" while speaking, "leaving" while flying to the corner. */
type Hello = "waiting" | "on" | "leaving" | "done";

function pickSuggestions(products: Product[], recipient: Recipient, occasion: Occasion, count = 3): Product[] {
  const sellable = products.filter((p) => !p.addOn);
  const matches = sellable.filter((p) => p.recipients.includes(recipient) && p.occasions.includes(occasion));
  const pool = matches.length >= count ? matches : [...matches, ...sellable.filter((p) => p.featured && !matches.includes(p))];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * Mudi, the mascot. Once a visit, after the home page's scroll has dropped (or the intro, on other pages),
 * Mudi pops up in the middle of the screen and says hello, then flies down to its corner, where it opens
 * only when tapped. Until it has been opened this session, a small "Click me" bubble appears beside it at
 * intervals. Hidden during checkout and in the customizer.
 * "Suggest a gift" works now from catalog tags. "Help me write it" lives in the
 * customizer, where its drafts drop straight into the text box.
 */
export function MascotPanel() {
  const pathname = usePathname();
  const { products } = useCatalog();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [nudge, setNudge] = useState(false);
  const [opened, setOpened] = useState(false);
  const [hello, setHello] = useState<Hello>("waiting");
  const panelRef = useRef<HTMLDivElement>(null);
  const cornerRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const tucked = useTuckOnScroll(!open && hello === "done");
  const hidden = pathname.startsWith("/checkout") || pathname.endsWith("/personalise");
  const leaveHello = useCallback(() => setHello("leaving"), []);
  const endHello = useCallback(() => setHello("done"), []);

  // Say hello once a visit: after the scroll has dropped on the home page, after the intro elsewhere.
  useEffect(() => {
    if (hello !== "waiting" || hidden) return;
    let timer = 0;
    let stopHero = () => {};
    const greet = () => {
      timer = window.setTimeout(() => {
        try {
          sessionStorage.setItem(HELLO_KEY, "1");
        } catch {}
        setHello("on");
      }, HELLO_AFTER_MS);
    };
    const stopIntro = onIntroDone(() => {
      let greeted = false;
      try {
        greeted = !!sessionStorage.getItem(HELLO_KEY);
      } catch {}
      if (greeted) setHello("done");
      else if (pathname === "/") stopHero = onHeroDone(greet, HELLO_HERO_FALLBACK_MS);
      else greet();
    });
    return () => {
      stopIntro();
      stopHero();
      window.clearTimeout(timer);
    };
  }, [hello, hidden, pathname]);

  useEffect(() => {
    if (hello !== "done") return;
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
  }, [opened, hello]);

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

  const suggestFromHello = () => {
    setHello("done");
    setNudge(false);
    setOpened(true);
    try {
      sessionStorage.setItem(NUDGE_KEY, "1");
    } catch {}
    setView("suggest");
    setOpen(true);
  };

  // Nothing floats over the checkout form or the customizer (it has its own "Help me write it").
  if (hidden) return null;

  return (
    <>
      <AnimatePresence>
        {(hello === "on" || hello === "leaving") && (
          <MudiHello
            leaving={hello === "leaving"}
            corner={cornerRef}
            reduceMotion={!!reduceMotion}
            onLeave={leaveHello}
            onGone={endHello}
            onSuggest={suggestFromHello}
          />
        )}
      </AnimatePresence>
      <div
        className={`fixed bottom-[calc(1rem+var(--sticky-bar,0px))] left-4 z-30 flex flex-col items-start gap-3 md:bottom-6 md:left-6 ${tuckClasses(tucked, "left")}`}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-label="Mudi, the Woodspeaks gift helper"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-h-[70dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-vellum p-5 shadow-[0_16px_48px_-16px_rgb(42_23_18/0.45)] outline-none"
            >
              {view === "home" && (
                <>
                  <div className="flex items-center gap-3">
                    {mudi && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mudi} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover object-[50%_25%] ring-1 ring-rule" />
                    )}
                    <p className="font-display text-xl leading-snug text-oxblood">Hello, I&rsquo;m Mudi.</p>
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
                      setResults(pickSuggestions(products, recipient, occasion));
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
                      onClick={() => recipient && occasion && setResults(pickSuggestions(products, recipient, occasion))}
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

        <div className={`relative ${hello === "done" ? "" : "invisible"}`}>
          <button
            ref={cornerRef}
            type="button"
            onClick={toggle}
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-oxblood-deep text-gold-light shadow-[0_8px_24px_-8px_rgb(42_23_18/0.5)] ring-2 ring-gold-light/60 transition-transform hover:-translate-y-0.5"
            aria-label={open ? "Close Mudi" : "Ask Mudi for help"}
            aria-expanded={open}
          >
            {open ? (
              <CloseIcon />
            ) : mudi ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mudi} alt="" className="h-full w-full scale-[1.35] object-cover object-[50%_22%]" />
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
    </>
  );
}

/**
 * Mudi's hello: pops up in the middle of the screen, says its piece word by word, then flies to the
 * corner button (`corner`) and hands over to it. With reduced motion it simply appears and fades.
 */
function MudiHello({
  leaving,
  corner,
  reduceMotion,
  onLeave,
  onGone,
  onSuggest,
}: {
  leaving: boolean;
  corner: RefObject<HTMLButtonElement | null>;
  reduceMotion: boolean;
  onLeave: () => void;
  onGone: () => void;
  onSuggest: () => void;
}) {
  const words = HELLO_TEXT.split(" ");
  const [shown, setShown] = useState(reduceMotion ? words.length : 0);
  const [paused, setPaused] = useState(false);
  const [target, setTarget] = useState<{ x: number; y: number; scale: number } | null>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const spoken = shown >= words.length;

  // Speak word by word, starting once Mudi has popped up.
  useEffect(() => {
    if (spoken) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 450 : HELLO_WORD_MS);
    return () => window.clearTimeout(t);
  }, [shown, spoken]);

  // Leave once there's been time to read it (not while a finger or mouse is on the bubble).
  useEffect(() => {
    if (leaving || paused || !spoken) return;
    const t = window.setTimeout(onLeave, HELLO_SHOW_MS);
    return () => window.clearTimeout(t);
  }, [leaving, paused, spoken, onLeave]);

  // Measure the flight down to the corner button, then fly (see onAnimationComplete).
  useEffect(() => {
    if (!leaving) return;
    const raf = requestAnimationFrame(() => {
      const from = faceRef.current?.getBoundingClientRect();
      const to = corner.current?.getBoundingClientRect();
      if (reduceMotion || !from || !to || !to.width) return onGone();
      setTarget({
        x: to.left + to.width / 2 - (from.left + from.width / 2),
        y: to.top + to.height / 2 - (from.top + from.height / 2),
        scale: to.width / from.width,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [leaving, corner, reduceMotion, onGone]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+var(--sticky-bar,0px))] z-40 flex flex-col items-center gap-3 px-4 md:bottom-24"
      exit={reduceMotion ? { opacity: 0, transition: { duration: 0.2 } } : undefined}
    >
      <AnimatePresence>
        {!leaving && (
          <motion.div
            role="status"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.18 } }}
            transition={{ delay: reduceMotion ? 0 : 0.3, duration: 0.3, ease: "easeOut" }}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            className="pointer-events-auto relative w-[min(21rem,100%)] rounded-2xl bg-vellum p-5 pr-11 shadow-[0_16px_48px_-16px_rgb(42_23_18/0.45)] ring-1 ring-rule"
          >
            <p className="sr-only">{HELLO_TEXT}</p>
            {/* Every word takes its space from the start, so the bubble never changes size as Mudi speaks. */}
            <p aria-hidden className="text-ink">
              {words.map((w, i) => (
                <span key={i} className={i < shown ? undefined : "opacity-0"}>
                  {w}{" "}
                </span>
              ))}
            </p>
            <button
              type="button"
              onClick={onSuggest}
              tabIndex={spoken ? undefined : -1}
              className={`mt-3 h-11 rounded-full bg-oxblood px-5 text-vellum transition-[opacity,background-color] hover:bg-wine ${spoken ? "" : "opacity-0"}`}
            >
              Suggest a gift
            </button>
            <button
              type="button"
              onClick={onLeave}
              aria-label="Close Mudi's hello"
              className="absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:text-oxblood"
            >
              <CloseIcon />
            </button>
            {/* The bubble's tail, pointing down at Mudi. */}
            <span aria-hidden className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-vellum" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={faceRef}
        aria-hidden
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.4 }}
        animate={target ? { opacity: 1, x: target.x, y: target.y, scale: target.scale } : { opacity: 1, y: 0, scale: 1 }}
        transition={target ? { duration: 0.75, ease: [0.65, 0, 0.35, 1] } : { type: "spring", stiffness: 260, damping: 16 }}
        onAnimationComplete={() => target && onGone()}
        className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-oxblood-deep text-gold-light shadow-[0_8px_24px_-8px_rgb(42_23_18/0.5)] ring-2 ring-gold-light/60"
      >
        {mudi ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mudi} alt="" className="h-full w-full scale-[1.35] object-cover object-[50%_22%]" />
        ) : (
          <WizardHatIcon width={52} height={52} />
        )}
      </motion.div>
    </motion.div>
  );
}
