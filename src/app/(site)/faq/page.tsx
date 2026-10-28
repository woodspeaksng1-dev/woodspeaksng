import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { pageMeta } from "@/lib/seo";
import { CRAFTING_DAYS, PRODUCTS } from "@/lib/catalog";
import { CONTACT } from "@/lib/contact";
import { formatNaira } from "@/lib/format";

export const metadata: Metadata = pageMeta({
  title: "Questions and answers",
  description:
    "Delivery areas and times, crafting time, personalisation limits, payment and refunds on personalised gifts from Woodspeaks in Lagos.",
  path: "/faq",
});

const scroll = PRODUCTS.find((p) => p.personalization.kind === "letter");
const puzzle = PRODUCTS.find((p) => p.personalization.kind === "reasons");
const letterWords = scroll?.personalization.kind === "letter" ? scroll.personalization.maxWords : 300;
const reasons = puzzle?.personalization.kind === "reasons" ? puzzle.personalization : null;

const link = "text-oxblood underline decoration-gold/60 underline-offset-4 hover:decoration-oxblood";

// Answers follow docs/PLAN.md. Values marked TO CONFIRM there (crafting time, perishable zones,
// payment provider) come from shared constants so they change in one place.
const GROUPS: { title: string; items: { q: string; a: ReactNode }[] }[] = [
  {
    title: "Delivery",
    items: [
      {
        q: "Where do you deliver?",
        a: "Across Lagos, to Abuja, Port Harcourt and Ibadan, and to other states in Nigeria. Cake, flowers and fresh roses go within Lagos Island and Mainland only, so they arrive fresh.",
      },
      {
        q: "How long will my order take?",
        a: `Every gift is made by hand, which takes about ${CRAFTING_DAYS} days. At checkout you choose the date you'd like it delivered, from the earliest date we can make it.`,
      },
      {
        q: "How much is delivery?",
        a: "It depends on the area. Choose your area at checkout and the fee is shown before you pay.",
      },
      {
        q: "Can I send a gift straight to someone else?",
        a: "Yes. Tick \"I'm sending this to someone else\" at checkout and add their name and phone number. You can also ask us to leave the price out of the package.",
      },
    ],
  },
  {
    title: "Personalising your gift",
    items: [
      {
        q: "How long can my love scroll letter be?",
        a: `Up to ${letterWords} words. The counter on the page shows how many you have left.`,
      },
      {
        q: "How does the 20 Reasons puzzle work?",
        a: reasons
          ? `Choose our 20 reasons, or write your own 20 for ${formatNaira(reasons.fee)} more, up to ${reasons.maxWordsEach} words each.`
          : "Choose our 20 reasons, or write your own.",
      },
      {
        q: "I don't know what to write. Can you help?",
        a: "Yes. Choose \"Help me write it\" when you personalise. Tell us who it's for, the occasion and the tone, and we'll suggest three messages you can use and edit.",
      },
      {
        q: "What kind of photo works best for a locket or polaroid?",
        a: "A clear, well-lit photo, as large as you have it. If a photo is too small to print sharply, we'll tell you before you add it to your cart.",
      },
      {
        q: "Will you check my spelling?",
        a: "We write exactly what you send, so please read it through before you add it to your cart. You'll see a full preview and tick a box to confirm.",
      },
    ],
  },
  {
    title: "Payment and refunds",
    items: [
      {
        q: "How can I pay?",
        a: "By card, bank transfer or USSD, through Paystack. We never see or store your card details.",
      },
      {
        q: "Can I get a refund on a personalised gift?",
        a: (
          <>
            Personalised gifts are made just for you, so we can&rsquo;t refund spelling mistakes in what you entered. If
            we make a mistake, or your gift is damaged on the way, we&rsquo;ll make it again.{" "}
            <Link href="/policies/refunds" className={link}>
              Read our refunds and remakes policy
            </Link>
            .
          </>
        ),
      },
      {
        q: "Do you do bulk or corporate orders?",
        a: (
          <>
            Yes, for teams, clients and events.{" "}
            <Link href="/corporate" className={link}>
              Tell us what you need
            </Link>
            .
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-28 sm:px-6">
      <h1 className="text-5xl text-oxblood md:text-6xl">Questions and answers</h1>
      <p className="mt-6 max-w-lg text-lg text-ink-soft">
        Can&rsquo;t find what you need?{" "}
        <a href={CONTACT.whatsappUrl()} className={link} rel="noopener">
          Message us on WhatsApp
        </a>
        .
      </p>

      {GROUPS.map((g, i) => (
        <section key={g.title} className="mt-14" aria-labelledby={`faq-${i}`}>
          <h2 id={`faq-${i}`} className="text-3xl text-oxblood">
            {g.title}
          </h2>
          <div className="mt-4 divide-y divide-rule border-y border-rule">
            {g.items.map((item) => (
              <details key={item.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-xl text-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden className="shrink-0 text-2xl text-gold transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="pb-5 text-lg text-ink-soft">{item.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
