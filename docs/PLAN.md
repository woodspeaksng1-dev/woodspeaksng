# Woodspeaks — full build plan

The scope, behaviour and order of work for the whole site. `docs/GUIDE.md` holds the rules (stack, brand,
security, SEO); this file holds **what to build**. Read both before starting a feature, and update the
"Status" section when a feature is done.

Source: the planning docs (Project Plan v2, Site Concept, Build Standards & Safeguards) plus decisions made
with the client up to 28 Oct 2026. Where this file and older notes disagree, this file wins.

## Dates (fixed by the contract)

| Date | Milestone |
| --- | --- |
| Sat 31 Oct | Frontend demo to the client and **written feature lock**. Anything asked for after this is Phase 2 and priced separately. |
| Sun 1 – Sat 7 Nov | Backend: Firebase, Paystack, emails, accounts, admin, mailing |
| Sun 8 – Tue 10 Nov | End-to-end testing, client walkthrough, client enters products, DNS move, live keys |
| Wed 11 Nov | Launch, handover notes, balance invoice |

Push to GitHub and have a Vercel preview link before the 31 Oct demo.

## Status (28 Oct)

Done (frontend, mock data):
- Preloader (pen writes the wordmark; plays once per visit on whichever page comes first, changed from
  every home load on 30 Oct; sent unwritten from the server; not skippable by tapping, reduced-motion safe)
- Navbar, footer, cart drawer (side panel on desktop, full sheet on phones, saved across refreshes)
- Home: hero (scroll film plays once and rests open; "Shop now" wax seal that breathes; customer moment
  card), Our items, Trusted by (client logos), customer moments stack, reviews section (the six from the old site, word for word)
- Shop with occasion/recipient filters; product page with sticky buy bar on phones
- About, Gallery (`/about/gallery`), Contact; "coming soon" pages for Checkout, Account, Corporate, FAQ, Policies
- Floating mascot, Mudi (Suggest a gift works; a "Click me" bubble appears at intervals until it's opened once
  per session) and WhatsApp button
- Customizer (`/products/<slug>/personalise`): letter with live scroll preview and pen, 20 reasons
  (standard or write-your-own, +fee), locket/polaroid photo with zoom, drag and a low-resolution warning;
  manual or assisted (drafts from the writing library) with "Use this"; final check with a required spelling
  tick; text drafts survive a refresh. Photos stay in the browser until the backend upload exists.
- Love scroll card photo taken from the old site (`products/love-scroll.webp`); the closed-scroll
  cut-out moved to `customizer/scroll-closed.webp`
- About: "Our story" and "What inspires us" are DRAFTS from the old site's wording, for client approval
- Checkout (`/checkout`) and confirmation (`/checkout/confirmation`), DEMO: one-page guest form with
  Zod validation (`src/lib/checkout.ts`), Nigerian phone check, recipient fields, zone dropdown, earliest
  date from crafting time, perishables limited to Lagos Island and Mainland, hide-price option, order
  summary with personalisation. "Place order (demo)" takes no payment: it keeps the order in the tab
  (`src/lib/demo-order.ts`), clears the cart and shows the confirmation (order number, delivery date,
  "Remind me" button that saves nothing yet). Set `PAYMENTS_LIVE` in `CheckoutForm.tsx` when Paystack lands.
- FAQ (`/faq`, indexed): delivery, personalisation, payment and refund answers built from this plan;
  limits and crafting time come from the catalog, so they update in one place
- Policies (`/policies/<slug>`): delivery, refunds, privacy, terms and acceptable use, written as DRAFTS in
  `src/lib/policies.ts`. They show a "being finalised" note and stay `noindex` and out of the sitemap
  until `draft: false`. Acceptable use added to the footer.
- Corporate (`/corporate`, indexed): what we offer, the brand logos and an enquiry form (Zod, honeypot).
  Sent to `/api/enquiry` (see Enquiries below); if sending fails, WhatsApp with the details filled in.
- Account (`/account`), DEMO: email-link sign-in form (sends nothing), then a labelled sample account with
  order tracking (Paid, Crafting, Dispatched, Delivered), saved addresses, reminders and NFC tag videos
- Admin panel (`/admin`), DEMO with SAMPLE data (`src/lib/admin/sample-data.ts`) in an in-memory store
  (`src/lib/admin/store.ts`; resets on reload): overview, orders (filter, detail with full personalisation,
  move status forward, print order sheet, NFC video or link with mark tag written; an NFC order can't be
  dispatched until its tag is written), products (edit details, price, tags, limits, SEO, featured, hidden),
  homepage (6 featured, moment order, logos), reviews (add with consent, approve), delivery (zone fees,
  estimates, perishables, crafting time), customers, emails (preview, test first, confirm before sending),
  reminders, enquiries and an activity log. Public pages moved into the `(site)` route group so admin has
  its own layout. `/admin` is OPEN (no sign-in) and `noindex`; it must sit behind the staff claim before
  it touches real data.
- Phone polish (28 Oct, 375px, every page): no horizontal overflow anywhere; footer, logo, contact and
  small text links enlarged to 40px+ tap targets; shop sort menu at 16px so iPhones don't zoom; footer no
  longer hidden behind the product page's sticky buy bar; Mudi is hidden on checkout. Still to do on
  a real phone: Android Chrome and iPhone Safari, slow 3G, and the reviews section with the six real reviews.
- Phone fixes (30 Oct, from testing on an iPhone): dev server now lets phones on the Wi-Fi load scripts
  (`allowedDevOrigins`; without it nothing was interactive, every tap reloaded the page and replayed the
  intro); WhatsApp button in WhatsApp green; mascot and WhatsApp clear the sticky buy bar by CSS (iPhone
  safe area included) and are hidden in the customizer; hero film loads during the intro; "Help me write it"
  letters now run 238 to 281 words; structured data sent as one `@graph` (Safari threw on the bare array).
  Checked end to end at 390px on the production build: intro, hero, navigation, all three customizers,
  cart, checkout, every page and admin, with no browser errors. Test on a phone against `npm run build`
  and `npx next start` (dev mode is much slower over Wi-Fi).
- Demo deploy (31 Oct): code on the client's GitHub (woodspeaksng1-dev/woodspeaksng); site on Vercel at
  https://woodspeaks.vercel.app (developer's account for the demo, deployed from the CLI; move the project
  to the client's Vercel Pro team and connect the repo before launch). The intro now runs from the static
  head script (`components/preloader/intro.ts`), so on slow phones the pen writes before the app loads.
- Client changes (4 Nov): mascot named Mudi; Mudi's drafts come with a note to proofread and personalise;
  puzzle preview cards are hearts like the real pieces; the scroll preview uses the real rod and curled foot
  cut from the hero film (`customizer/scroll-top|bottom`) with a matching paper sheet (`.scroll-sheet`) that
  grows with the letter; official WhatsApp 0707 088 5263 and Instagram @woodspeaks_nigeria. Project rules
  moved to `docs/GUIDE.md`.
- Client changes (9 Nov): locket preview redrawn as the real antique-brass locket (beaded rim, bezel,
  glass, hinged lid with gear engraving like the cover, chain; `LocketFrame.tsx`, brass tokens in a static
  `@theme` block because the SVG reads them with var()); NFC tag simplified to a video file (100 MB) or a
  link, with its own Personalise page and a simpler admin step; puzzle reasons up to 6 words; client answers
  recorded under "Still to confirm".
- Scroll preview (9 Nov): a rod at both ends like the real scroll (bottom rod built from the top one,
  border flipped); letter text smaller as it grows and the preview wider on desktop, so 300 words stays
  a sensible length (about 770 px on desktop, 850 px on phones).
- Media slots (`public/media`), SEO foundation (metadata, sitemap, robots, structured data, share images)

Next, in this order:
1. ~~Customizer~~ (done 28 Oct; NFC tag upload comes with the NFC backend)
2. ~~Checkout page UI and order confirmation~~ (done 28 Oct, demo; Paystack in the backend stage)
3. ~~Account, Corporate, FAQ and policy pages~~ (done 28 Oct; copy and policies need client approval)
4. ~~Admin panel screens~~ (done 28 Oct, sample data; real data and staff sign-in in the backend stage)
5. ~~Phone polish~~ (done 28 Oct in the browser at phone size; one pass on real phones still due), then the 31 Oct demo
6. Backend (from 1 Nov), see "Backend" below

## Products and personalisation

The catalog is in `src/lib/catalog.ts` (prices from the client's asset list, which is final). No gift
wooden boxes: the client has stopped selling them. Products on the old site but not on the asset list
(diffuser, candle, teddy bear, black box, engraved box) are **not** sold.

| Product | What's personalised | Limit | Live preview |
| --- | --- | --- | --- |
| Handcrafted Love Scroll (₦15,590) | Handwritten letter on aged parchment, sealed with a personalised wax stamp | Up to 300 words | A pen writes the letter onto the parchment as they type |
| 20 Reasons I Love You Puzzle | Standard reasons (₦20,000) or write your own 20 (**+₦15,000**, so ₦35,000) | 6 words per reason | Heart cards fill in as they type |
| Locket | Customer's photo set inside | 1 photo | Photo shown inside the open antique-brass locket |
| Polaroid | Customer's photo printed | 1 photo per polaroid | Photo shown in a polaroid frame |
| NFC Memory Tag (₦7,000 add-on) | A video file or a link to one; staff put it on the tag | Up to 100 MB | The video plays, or the link shows |
| Others (pocket watch, journal, bouquet, cake, rose, magnifying glass) | Nothing yet | — | — |

Limits are counted in **words**, and the counter stops input at the limit. The client's catalog sheet
confirms final values.

## Customizer

The product page sells first; customizing comes after seeing the product. Both paths end in the same
preview and a spelling check:

1. Product page → **Personalise**
2. Choose **Write it myself** (manual) or **Help me write it** (assisted). Customers can switch modes
   without losing what they typed; in assisted mode the text box stays editable.
   - Manual: type the text; the word limit shows live.
   - Assisted: Mudi asks who it's for, the occasion and the tone, then shows 3 options, each with a
     **Use this** button that drops it into the text box and the preview. No copy and paste. A note asks
     the buyer to proofread and personalise the draft (we print exactly what they send).
3. Live 2D preview using the real product images (`public/media/customizer/*`):
   - Scroll: a calligraphy pen writes the letter onto the parchment as they type (the signature moment
     of the site; keep everything else quiet). With reduced motion, the finished text shows at once.
   - Puzzle: the reasons appear on the puzzle cards; 20 numbered fields, 6 words each, a counter of how
     many are filled; can't add to cart with empty cards in write-your-own mode. In assisted mode the
     Mudi drafts all 20 and the customer edits any of them.
   - Locket and polaroid: photo upload with a simple crop tool and a warning when the image is too small
     to print sharply. Same private storage as NFC videos (backend).
4. Final check: full preview plus a required tick, "I've checked the spelling" (custom items can't be
   refunded for customer spelling errors).
5. **Add to cart.** The customization is saved with the cart line, so it survives refreshes and the
   payment redirect. Personalised items are always their own cart line.

Validate all customer text with `src/lib/validation.ts` (Zod) on the client for feedback and again on the
server at checkout. The assisted path drafts from the writing library (see Mudi, the mascot).

## NFC tag video (simplified 9 Nov, client's call)

The client sorts the tag side themselves; the site only collects the video. No memory page, no approval
step, no QR code.

For the buyer: the NFC tag has its own Personalise page. They upload a video (MP4 or MOV, up to 100 MB)
or paste a link to one (YouTube, Google Drive, Instagram…, anyone with the link must be able to watch).
The preview plays the video or shows the link; the check step asks them to confirm it.

For staff: the order shows the file (download, backend) or the link; staff put it on the tag with their
NFC writing app and mark the tag written. An order with an NFC tag can't be marked dispatched until then.

Safeguards: video files only, 100 MB cap checked in the browser and again by the upload rules; links must
be `http(s)` (checked on entry and before admin renders them); files stored privately, deleted after
delivery (policy wording updated).

## Mudi, the mascot

A guided helper with buttons, not an open chatbot. Floating bottom-left; never opens on its own.
- **Suggest a gift** (done): who it's for + occasion → 3 random products tagged with both, falling back
  to featured products. No AI call.
- **Help me write it** (done, in the customizer): who, occasion, tone → 3 letters → **Use this** inserts
  one, always editable. No AI (the client chose a curated library over Gemini, 4 Nov):
  `src/lib/draft-library.ts` holds 8 versions of every letter part per occasion, tone and recipient,
  mixed at random, so the same answers give new letters each time (over 200,000 mixes per set of
  answers, 230 to 300 words each, never over the scroll's limit). Romantic is offered for partners only;
  weddings and anniversaries read differently to a partner than to anyone else. The puzzle draws 20 of
  60 reasons per recipient. Loaded only when a customer asks, in the browser; no server, no limit.
  The client should read the library once before launch.

## Checkout and after purchase

One page, guest checkout, no account needed. Delivery fee comes from the zone chosen.
1. Your details: name, email, phone. Below the email, an **unticked** box: "Send me updates and gift
   reminders from Woodspeaks."
2. "Sending to someone else?" If yes: recipient's name and phone.
3. Delivery: zone dropdown (fee updates instantly), full address, landmark, preferred delivery date
   (not earlier than crafting time allows). Perishables (cake, bouquet, rose) only to some zones.
4. Gift option: "Don't include the price in the package."
5. Order summary: items, personalisation text, add-ons, delivery fee, total.
6. **Pay with Paystack** (card, bank transfer, USSD).

After payment:
- Confirmation page: order number, summary, expected delivery date, and "Remind me before this date next
  year?" It only displays status from the server; only the verified webhook marks an order paid.
- Confirmation email to the customer; **new-order email to the Woodspeaks team** (email only, no WhatsApp
  alerts), with all personalisation text.
- Status emails as the order moves: crafting, dispatched, delivered.
- If payment fails or the tab is closed: the cart is kept, and one reminder email goes out if the order
  stays unpaid.

Delivery zones (fees and estimates still to come from the client, `SHIPPING_ZONES` in the catalog):
Lagos Island/Lekki/Ajah; Lagos Mainland; Lagos outskirts (Ikorodu, Epe, Badagry); Abuja/Port
Harcourt/Ibadan; other states. Crafting time is 2–3 days (to confirm); product pages show an
"order by … to receive by …" line.

## Other pages

| Page | Content |
| --- | --- |
| Account | Email-link sign-in; order history and tracking; saved addresses; reminders (edit or delete) |
| Corporate gifting | What they offer businesses, the brand logos, and a bulk enquiry form (company, quantity, budget, date needed) with a honeypot spam field; enquiries go to the team by email |
| Contact | Contact form with a spam check, WhatsApp link, email, phone, address and opening hours |
| FAQ | Delivery times and areas, crafting time, personalisation limits, payment options, refunds on custom items |
| Policies | Privacy, Terms of sale, Delivery, Refunds and remakes, Acceptable use (for uploads) |
| About | About us, Our story, What inspires us (text from the client), gallery preview |
| 404 and empty states | On-brand "page not found" linking to Shop; friendly empty cart; clear loading and error messages |

Refund policy for custom items: no refunds for customer-entered spelling errors; remakes for Woodspeaks'
own errors or damage in transit.

## Admin panel (staff only)

Staff run the shop without a developer.

| Area | What staff can do |
| --- | --- |
| Orders | See new and past orders; view personalisation text, buyer, recipient and delivery details; move status Paid → Crafting → Dispatched → Delivered (each emails the customer); print an order sheet for the workshop; for NFC orders, download the video or open the link, and mark the tag written |
| Products | Add and edit: photos, price, description, dimensions, included items, add-ons, occasion and recipient tags, personalisation limits, SEO title and image alt text; mark featured (the home page shows 6); hide or show |
| Homepage | Choose the featured products; upload and order customer moments; manage brand logos |
| Reviews | Add and approve real customer reviews (they feed "What they say about us") |
| Delivery | Edit zone fees and estimates; set crafting time |
| Customers | List of customers and who opted in to emails |
| Emails | Write a broadcast from a branded template, send a test first, then send to everyone opted in; every email has an unsubscribe link |
| Reminders | See upcoming customer reminders; they send automatically |
| Enquiries | Corporate and contact form messages |
| Security | Staff accounts only (admin claim set by a script, not a UI); every change logged with who made it |

Phase 2 (after launch, priced separately): sales analytics, discount codes, staff roles, campaign stats.

## Backend (from 1 Nov)

| Layer | Choice |
| --- | --- |
| Database | Cloud Firestore, read and written from API routes and server actions with the Firebase Admin SDK |
| Sign-in | Firebase Auth email links; admin access via a custom claim |
| Files | Firebase Storage (product images, customer photos, NFC videos). Needs the Blaze plan; until the client adds a card, built and tested on the local emulator |
| Payments | Paystack, the client's existing account (**confirm**: the old site's footer mentions Kora) |
| Email | Resend: order alerts, status emails, broadcasts, reminders |
| Scheduled jobs | Vercel Cron: daily reminder emails, unpaid-order nudges, daily Paystack vs orders reconciliation |
| Hosting | Vercel Pro on the client's account, on woodspeaks.ng |

Firestore collections: `products`, `shippingZones`, `orders` (line items copied at time of sale, text,
customer, address, zone, total in kobo, status, Paystack reference), `paystackEvents` (one doc per
reference, created in a transaction so a repeated webhook can't fulfil twice), `customers` (email, name,
addresses, marketing opt-in), `reminders`, `rateLimits`, plus `reviews`, `moments`, `enquiries`,
`auditLog`. Security rules deny every browser read and write (anonymous, customer and staff alike):
the browser uses Firebase only to sign in, and all data goes through our server (Admin SDK), which checks
input and who is asking. Rules live in `firestore.rules`, tested by `npm run test:rules`.

Backend order of work:
1. Firebase project, collections, security rules, seed products; catalog reads from Firestore.
   Done 9 Nov: project `woodspeaks-f6ede` (Firestore in europe-west2, Spark plan for now; email-link and
   Google sign-in on), deny-all rules published with 24 passing tests, 11 products, 5 zones and shop
   settings seeded, server connection in `src/lib/server/firebase.ts`. The shop now reads the catalog
   from Firestore (`src/lib/server/catalog.ts`: cached an hour under the `catalog` tag, every document
   schema-checked, 8 s timeout, falls back to the starting catalog for a minute if Firestore is down);
   browser components get it from `CatalogProvider`. Hidden products leave the shop and 404. Admin demo
   still uses the seed data until step 6.
   Order pricing done 9 Nov (`src/lib/order-pricing.ts`, 34 tests): browser sends IDs, quantities and
   personalisation only; prices, puzzle fee and delivery come from the catalog the server reads itself
   (`readCatalog()`, uncached and strict); every line is checked against its product.
2. ~~Gemini route~~ dropped 4 Nov: the client chose a curated writing library (done)
3. Paystack initialize with server-side totals in kobo; pending order
4. Webhook: HMAC SHA512 of the raw body in constant time, verify the transaction with Paystack (amount,
   NGN, reference), fulfil each reference once, reply 200 fast
   Steps 3 and 4 done 9 Nov: `POST /api/checkout` (details checked, cart priced from `readCatalog()`,
   pending order `orders/{WS-…}` with a random 10-character reference, Paystack payment page; 10 attempts
   per IP per 10 minutes), `POST /api/paystack/webhook` (signature, verify with Paystack, exact kobo and
   NGN, Firestore transaction marks paid once, `paystackEvents/{reference}` guard, emails after the reply),
   `/checkout/confirmation?reference=` runs the same check so the buyer sees "paid" even before the
   webhook, and empties the cart. Order emails (buyer confirmation, team alert) go through Resend with
   every customer value escaped. Tests: 61 unit, 40 on the emulator (rules, checkout, paid-once with five
   simultaneous confirmations, wrong amount, failed payment, forged signature, repeated webhook, rate
   limit). Server region pinned to London (`vercel.json`, lhr1) next to Firestore.
   To go live: deploy, set the webhook URL in Paystack, add a Firestore TTL policy on
   `rateLimits.expiresAt`, then one real test payment on a phone.
5. Order emails; email-link sign-in, order history, saved addresses
   Customer accounts done 10 Nov: /account signs in with Google or an emailed link (any verified email,
   no sign-up; links rate limited 3 an hour per email); 14-day httpOnly SameSite=Lax cookie (Firebase's
   maximum is 2 weeks); orders found by email so guest orders appear, unpaid checkouts left out; status
   tracker; up to 5 saved addresses (real delivery areas only); checkout fills name, email, phone and
   offers saved addresses. Sign-in code shared with admin (`auth-session.ts`, `SignInForm`). 10 emulator
   tests. Customer emails (links, confirmations) only reach real inboxes once woodspeaks.ng is verified in
   Resend. Copy now says delivery across Lagos (not Nigeria).
6. Admin panel on real data
   Sign-in and team done 10 Nov: /admin/login (Google or an emailed one-time link we send through Resend),
   server-checked httpOnly SameSite=Strict session cookie (7 days, revocation checked every request); the
   team in Firestore `staff/{email}`: one owner (woodspeaksng1@gmail.com, set with `scripts/set-owner.mjs`)
   who adds and removes staff on /admin/team (removal signs them out at once). Every admin page sits behind
   the check in `(panel)/layout.tsx`; admin route handlers check again (`requireStaffRequest`) plus Origin.
   14 emulator tests.
   Admin on real data done 10 Nov: overview, orders (to do / each status / awaiting payment, search, detail
   with personalisation, paid → crafting → dispatched → delivered in a transaction, NFC tag written before
   dispatch, one customer email on dispatch), products (all fields, featured max 6, hidden, limits; saves
   refresh the shop at once), delivery (fees, estimates, fresh items, add and remove areas, crafting time),
   customers (from paid orders), activity log (payments and every change, by whom). Emails and
   homepage ordering show "being connected" and are out of the menu until built.
   Demo store and sample data deleted. 15 more emulator tests, plus a browser walk-through of every screen.
   Fixed on the way: product pages failed after an edit (params now read inside Suspense, per the ISR
   with Cache Components guide); admin pages are request-time only (connection()); navbar links and the
   floating helpers sit in Suspense; the emulator uses a throwaway certificate so it behaves like production.
7. Mailing: opt-in list (double opt-in), template broadcasts, reminder dates, daily job, unpaid nudge
8. Uploads: customer photos and NFC videos (resumable, private, 100 MB cap in Storage rules)

Tests that must exist before launch: cart totals (add-ons, every zone, puzzle fee); personalisation
validation edge cases; webhook (valid signature, bad signature, wrong amount, repeated delivery);
Firestore rules (anonymous, customer, admin); one
full checkout on a real phone in test mode, then one small live payment and refund.

## Launch checklist

- Copy every DNS record first; keep MX (email) records unchanged; switch DNS on 10 Nov
- 301 redirect map from the old site's URLs to the new pages
- SPF, DKIM and DMARC for woodspeaks.ng so emails don't land in spam
- Live Paystack keys; one small live payment and refund
- Search Console: verify, submit the sitemap; set `NEXT_PUBLIC_SITE_URL` if the domain isn't www.woodspeaks.ng
- Google Business Profile for Woodspeaks in Lagos
- Error tracking (Sentry), uptime monitor, Firestore backups, funnel analytics (view, customize, add to
  cart, checkout, paid); cookie banner only if tracking cookies are used
- Privacy policy naming Paystack, Firebase, Vercel and the email provider (NDPA 2023 / GAID);
  the client confirms obligations with a Nigerian data protection practitioner
- Core Web Vitals "good" on a mid-range Android (LCP < 2.5 s, INP < 200 ms, CLS < 0.1)
- Every account (domain, Vercel, Firebase, Paystack, Resend) in the client's name; keys rotated
  after launch; handover pack (accounts list, admin guide, running costs, support terms)

## Still to confirm with the client

Answered 6 to 9 Nov (recorded here; done in code where noted):
- Colours and fonts approved as they are. Puzzle write-your-own fee ₦15,000. Polaroid takes 1 photo.
- Reasons: up to 6 words each (done). Wax stamp carries a "W" (done in the scroll preview).
- Preloader approved. About, FAQ and policy pages approved in principle.
- Reviews: keep the six from the old site as they are. Customer moments: permission given, no names shown.
- Delivery: 38 Lagos locations with a flat fee each (sent 9 Nov; done: in Firestore, checkout and tests).
  No dispatch API needed for launch.
- NFC: video file up to 100 MB or a link; no memory page; the client handles the tag (done, see above).
- Product photos (bouquet, magnifying glass, cake, rose, NFC tag): the client uploads them from admin.
- AI drafts: replaced by the curated writing library (done 4 Nov).

Still open:
1. Logo: their bamboo mark is taken from the old site's favicon (1024px) and used for the site icons only.
   The wax stamp carries a "W" (done in the scroll preview). Confirm the mark is current; an SVG if they have one
2. Paystack or Kora (old site footer says Kora), then their keys
3. Crafting time per order, and the shortest notice for a delivery date
4. The exact 20 reasons printed on the standard puzzle (6 words max). The customizer shows a provisional
   set (`STANDARD_REASONS` in `src/lib/drafts.ts`) until they send it
5. Which of the 38 areas can take cake, flowers and roses (all assumed yes for now), and delivery
   estimates per area if they want them shown
6. How many admin logins, and for whom
7. Did Woodspeaks start in 2024? (About page)
8. Whether their business email is hosted on Hostinger (decides Resend or Hostinger mail)
9. The Firebase Blaze plan (a card on file, budget alert at about $10) before uploads go live
10. Read and approve Mudi's writing library
11. Whether any product takes an engraving (some old reviews mention engraving and gold inlay)
12. The privacy policy needs a Nigerian data protection practitioner's review; the draft policies hold
    assumptions to confirm (48-hour damage reports, refunds only before crafting, second delivery attempt fee,
    data requests within 30 days)
