@AGENTS.md

# Woodspeaks — project guide

E-commerce rebuild for Woodspeaks Limited (woodspeaks.ng), a Lagos gifting brand: personalised scrolls,
keepsakes, flowers and treats. Sole aim is conversion. Mobile-first: most buyers are on phones over mobile data.

Planning docs (source of truth for scope): Project Plan v2, Site Concept, Build Standards & Safeguards.

## Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS v4
- Motion (`motion/react`) for animation, Zustand for the cart, Zod for validation
- Backend stage (from Nov 1): Firebase (Firestore, Auth email links, Storage), Paystack, Gemini, Resend, Vercel
- Fonts are self-hosted from `src/app/fonts/` via `next/font/local` (no Google requests)

## Commands
- `npm run dev` — local dev server
- `npm run lint` · `npx tsc --noEmit` · `npm run build` — run all three before committing
- `node scripts/generate-wordmark.mjs` — regenerates the preloader wordmark paths

## Layout
- `src/app/` routes. Home, shop, products/[slug], about, contact are real; checkout, account, corporate, faq,
  policies are `ComingSoon` placeholders.
- `src/components/` by area: layout, home, product, cart, floating (mascot, WhatsApp), preloader, ui
- `src/lib/` types, mock catalog (from the client's asset list), cart store, validation, formatting, contact

## Brand rules
- Colours, fonts and spacing come ONLY from tokens in `src/app/globals.css` (`@theme`). No raw hex in components.
- Colours are provisional (burgundy/cream/gold) until the client sends hex codes; change them in one place.
- Headings: Playfair Display. Body: Manrope. Pinyon Script appears only in the preloader wordmark paths.
- Copy: sentence case, plain and warm, in the client's voice. Buttons say exactly what happens.
- Banned patterns (they read as AI-generated): gradient blobs, glassmorphism, all-caps eyebrow labels over
  headings, "→" on buttons, emoji as icons, identical fade-up on every section, one word in a headline styled
  differently, stock images, AI images of products that don't exist (renders must start from the client's real product
  photos and match what the customer receives), invented testimonials, customer moments or brand logos.
- Motion only where it shows something (preloader pen, hero scroll film, seal breathing and press, cart, photo stack).
  Always respect `prefers-reduced-motion`.

## Media and placeholders
Real photos and videos go in `public/media` (slots listed in `public/media/README.md`). `npm run media`
(also run before dev and build) writes `src/lib/media-manifest.ts`; `src/lib/media.ts` looks files up by
slot name and components fall back to drawn placeholders when a file is missing.
- Hero film (`hero/product.*`): the client's scroll video with the background removed (rembg, isnet) and
  composited onto the parchment colour, so it plays in every browser with no box; plays once, rests open.
  If `--color-parchment` changes, re-composite the film onto the new colour.
- Seal, logos and product cut-outs are transparent images (backgrounds removed), not multiplied.
  Products: `products/<slug>-cutout` (transparent, on the card tone) or `products/<slug>` (full styled photo).
- Videos: `LoopVideo` (hero) and `HoverVideo` (cards: hover on mouse screens, in view on touch); both keep the
  poster for reduced motion and data saver.

Still waiting on the client: wordmark (Wordmark, preloader), reviews (`src/lib/reviews.ts`), names for
customer moments (`src/lib/gallery.ts`), photos for bouquet, magnifying glass, cake, real rose and NFC tag,
contact details (lib/contact.ts), crafting time, delivery fees (SHIPPING_ZONES), occasion/recipient tags.

## SEO
- Site identity lives in `src/lib/site.ts` (set `NEXT_PUBLIC_SITE_URL` if the domain changes).
- Every indexable page uses `pageMeta()` from `src/lib/seo.ts`: title, description, canonical, full Open Graph
  and Twitter tags (Next replaces `openGraph` per page, so never set it by hand). Default share image: `public/og.jpg`.
- Structured data (`src/lib/structured-data.ts`): Organization + WebSite in the layout, Product + BreadcrumbList on
  product pages. Never add ratings or reviews to it until real reviews exist.
- `app/sitemap.ts` lists real pages only; "coming soon" pages stay `noindex` and out of the sitemap.
- Icons: `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` (from the seal).

## Security rules (non-negotiable)
- Never compute or trust prices in the browser. The cart stores product IDs and choices; the server prices orders.
- Every API route and server action validates input with Zod and checks auth itself. Never rely on proxy alone.
- No `dangerouslySetInnerHTML` except the static intro script in `app/layout.tsx` and `components/seo/JsonLd.tsx`
  (server-rendered from our own data, `<` escaped). Never pass user input to either.
- No secrets in client code; never prefix a secret with `NEXT_PUBLIC_`. Keys live in `.env.local` and Vercel.
- Paystack webhook: HMAC SHA512 on the raw body, verify the transaction with Paystack, fulfil each reference once.
- Personalised text is user input: validate with `src/lib/validation.ts`, escape in emails.
- No new dependency without a reason; prefer what's installed.

## Personalisation rules (from the client's current site; confirm with the catalog sheet)
- Love scroll: letter up to 300 words, personalised wax stamp
- 20 Reasons puzzle: standard ₦20,000, write-your-own +₦15,000, 20 reasons × 5 words
- Locket, polaroid: photo upload
- NFC tag (₦7,000 add-on): video, voice note or photos on a private memory page
