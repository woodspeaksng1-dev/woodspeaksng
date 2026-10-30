# Woodspeaks — full build plan

The scope, behaviour and order of work for the whole site. `CLAUDE.md` holds the rules (stack, brand,
security, SEO); this file holds **what to build**. Read both before starting a feature, and update the
"Status" section when a feature is done.

Source: the planning docs (Project Plan v2, Site Concept, Build Standards & Safeguards) plus decisions made
with the client up to 28 Oct 2026. Where this file and older notes disagree, this file wins.

## Dates (fixed by the contract)

| Date | Milestone |
| --- | --- |
| Sat 31 Oct | Frontend demo to the client and **written feature lock**. Anything asked for after this is Phase 2 and priced separately. |
| Sun 1 – Sat 7 Nov | Backend: Firebase, Gemini, Paystack, emails, accounts, admin, mailing |
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
- Floating wizard (Suggest a gift works; a "Click me" bubble appears at intervals until it's opened once
  per session) and WhatsApp button
- Customizer (`/products/<slug>/personalise`): letter with live scroll preview and pen, 20 reasons
  (standard or write-your-own, +fee), locket/polaroid photo with zoom, drag and a low-resolution warning;
  manual or assisted (mock drafts, 6 per visit) with "Use this"; final check with a required spelling
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
  Until email sending exists, a valid enquiry opens WhatsApp with the details filled in (`EMAIL_LIVE`).
- Account (`/account`), DEMO: email-link sign-in form (sends nothing), then a labelled sample account with
  order tracking (Paid, Crafting, Dispatched, Delivered), saved addresses, reminders and memory messages
- Admin panel (`/admin`), DEMO with SAMPLE data (`src/lib/admin/sample-data.ts`) in an in-memory store
  (`src/lib/admin/store.ts`; resets on reload): overview, orders (filter, detail with full personalisation,
  move status forward, print order sheet, NFC approve, copy link, mark written; an NFC order can't be
  dispatched until its tag is written), products (edit details, price, tags, limits, SEO, featured, hidden),
  homepage (6 featured, moment order, logos), reviews (add with consent, approve), delivery (zone fees,
  estimates, perishables, crafting time), customers, emails (preview, test first, confirm before sending),
  reminders, enquiries and an activity log. Public pages moved into the `(site)` route group so admin has
  its own layout. `/admin` is OPEN (no sign-in) and `noindex`; it must sit behind the staff claim before
  it touches real data.
- Phone polish (28 Oct, 375px, every page): no horizontal overflow anywhere; footer, logo, contact and
  small text links enlarged to 40px+ tap targets; shop sort menu at 16px so iPhones don't zoom; footer no
  longer hidden behind the product page's sticky buy bar; the wizard is hidden on checkout. Still to do on
  a real phone: Android Chrome and iPhone Safari, slow 3G, and the reviews section with the six real reviews.
- Phone fixes (30 Oct, from testing on an iPhone): dev server now lets phones on the Wi-Fi load scripts
  (`allowedDevOrigins`; without it nothing was interactive, every tap reloaded the page and replayed the
  intro); WhatsApp button in WhatsApp green; mascot and WhatsApp clear the sticky buy bar by CSS (iPhone
  safe area included) and are hidden in the customizer; hero film loads during the intro; "Help me write it"
  letters now run 238 to 281 words; structured data sent as one `@graph` (Safari threw on the bare array).
  Checked end to end at 390px on the production build: intro, hero, navigation, all three customizers,
  cart, checkout, every page and admin, with no browser errors. Test on a phone against `npm run build`
  and `npx next start` (dev mode is much slower over Wi-Fi).
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
| 20 Reasons I Love You Puzzle | Standard reasons (₦20,000) or write your own 20 (**+₦15,000**, so ₦35,000) | 5 words per reason | Cards fill in as they type |
| Locket | Customer's photo set inside | 1 photo | Photo shown inside the open locket |
| Polaroid | Customer's photo printed | Photo count to confirm | Photo shown in a polaroid frame |
| NFC Memory Tag (₦7,000 add-on) | Video, voice note or photos on a private memory page | See NFC section | Memory page preview |
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
   - Assisted: the wizard asks who it's for, the occasion and the tone (plus an optional note, up to
     150 characters), then shows 3 options, each with a **Use this** button that drops it into the text
     box and the preview. No copy and paste.
3. Live 2D preview using the real product images (`public/media/customizer/*`):
   - Scroll: a calligraphy pen writes the letter onto the parchment as they type (the signature moment
     of the site; keep everything else quiet). With reduced motion, the finished text shows at once.
   - Puzzle: the reasons appear on the puzzle cards; 20 numbered fields, 5 words each, a counter of how
     many are filled; can't add to cart with empty cards in write-your-own mode. In assisted mode the
     wizard drafts all 20 and the customer edits any of them.
   - Locket and polaroid: photo upload with a simple crop tool and a warning when the image is too small
     to print sharply. Same private storage as NFC uploads (backend).
4. Final check: full preview plus a required tick, "I've checked the spelling" (custom items can't be
   refunded for customer spelling errors).
5. **Add to cart.** The customization is saved with the cart line, so it survives refreshes and the
   payment redirect. Personalised items are always their own cart line.

Validate all customer text with `src/lib/validation.ts` (Zod) on the client for feedback and again on the
server at checkout. Until the Gemini route exists, the assisted path uses mock drafts.

## NFC memory message (included in scope at no extra cost)

For the buyer:
1. Add the NFC tag on the product page or in the cart.
2. Upload now, or later from a private link in the confirmation email, up to a cut-off before dispatch.
3. Preview the memory page exactly as the recipient will see it, with an optional short written note.
4. Replace the upload any time before the cut-off.

For the recipient: tapping the tag opens a branded memory page that plays the message. A QR code on the
note card opens the same page for phones without NFC.

For staff: each NFC order shows its upload in the admin panel; staff approve it, write the page link to
the tag with an NFC writing app, and mark it done. An order with an NFC tag can't be marked dispatched
until its upload is approved and the tag is written.

Safeguards:
- File types: video (MP4, MOV), audio (M4A, MP3), photos (JPG, PNG; iPhone HEIC converted)
- Size: proposed up to 2 minutes of video or 10 photos (final limits from the client)
- Resumable uploads with a progress bar; videos compressed for phones
- Each memory page has a long random link, is `noindex`, and shows no names or order details in the URL
- An Acceptable Use policy; staff approve every upload; retention period agreed with the client

## Wizard mascot

A guided helper with buttons, not an open chatbot. Floating bottom-left; never opens on its own.
- **Suggest a gift** (done): who it's for + occasion → 3 random products tagged with both, falling back
  to featured products. No AI call.
- **Write my message**: who, occasion, tone, optional 150-character note → Gemini returns 3 options
  within the product's limit → **Use this** inserts one into the customizer.
- Limits: 5–8 generations per visit with a friendly note at the limit; no names, emails or addresses
  sent to the AI; results are always editable.

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
| Account | Email-link sign-in; order history and tracking; saved addresses; reminders (edit or delete); NFC uploads |
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
| Orders | See new and past orders; view personalisation text, buyer, recipient and delivery details; move status Paid → Crafting → Dispatched → Delivered (each emails the customer); print an order sheet for the workshop; for NFC orders, review and approve the upload and copy the link to write onto the tag |
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
| Files | Firebase Storage (product images, customer photos, NFC uploads) |
| AI | Gemini via the Google Gen AI SDK, JSON response mode |
| Payments | Paystack, the client's existing account (**confirm**: the old site's footer mentions Kora) |
| Email | Resend: order alerts, status emails, broadcasts, reminders |
| Scheduled jobs | Vercel Cron: daily reminder emails, unpaid-order nudges, daily Paystack vs orders reconciliation |
| Hosting | Vercel Pro on the client's account, on woodspeaks.ng |

Firestore collections: `products`, `shippingZones`, `orders` (line items copied at time of sale, text,
customer, address, zone, total in kobo, status, Paystack reference), `paystackEvents` (one doc per
reference, created in a transaction so a repeated webhook can't fulfil twice), `customers` (email, name,
addresses, marketing opt-in), `reminders`, `rateLimits`, plus `reviews`, `moments`, `enquiries`,
`nfcUploads`, `auditLog`. Security rules: default deny; browsers may read only products and shipping
zones; everything else goes through the server.

Backend order of work:
1. Firebase project, collections, security rules, seed products; catalog reads from Firestore
2. Gemini route (input cleaning, 150-char cap, schema-validated output of 3 messages ≤ 250 chars each,
   per-IP and per-session limits plus a daily global cap); the wizard goes live
3. Paystack initialize with server-side totals in kobo; pending order
4. Webhook: HMAC SHA512 of the raw body in constant time, verify the transaction with Paystack (amount,
   NGN, reference), fulfil each reference once, reply 200 fast
5. Order emails; email-link sign-in, order history, saved addresses
6. Admin panel on real data
7. Mailing: opt-in list (double opt-in), template broadcasts, reminder dates, daily job, unpaid nudge
8. NFC uploads (resumable, private) and the memory page

Tests that must exist before launch: cart totals (add-ons, every zone, puzzle fee); personalisation
validation edge cases; webhook (valid signature, bad signature, wrong amount, repeated delivery);
Firestore rules (anonymous, customer, admin); AI route (schema, rate limit, empty and hostile input); one
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
- Privacy policy naming Paystack, Firebase, Gemini, Vercel and the email provider (NDPA 2023 / GAID);
  the client confirms obligations with a Nigerian data protection practitioner
- Core Web Vitals "good" on a mid-range Android (LCP < 2.5 s, INP < 200 ms, CLS < 0.1)
- Every account (domain, Vercel, Firebase, Paystack, Gemini, Resend) in the client's name; keys rotated
  after launch; handover pack (accounts list, admin guide, running costs, support terms)

## Still to confirm with the client

1. Brand kit: logo SVGs, colour hex codes, fonts (colours in `globals.css` are provisional)
2. Paystack or Kora (old site footer says Kora)
3. Puzzle price: old site shows +₦10,000 for write-your-own; the asset list says +₦15,000 (we follow the asset list)
4. What goes on the scroll's personalised wax stamp (initials, a symbol?)
5. How many photos the polaroid takes
6. Whether any product takes an engraving, and if so the font and limits
7. Delivery fees and estimates for the 5 zones (checkout shows "We'll confirm the fee" until then); which
   zones take cake, flowers and roses (assumed Lagos Island and Mainland); crafting time (assumed 3 days); shortest notice for a preferred date; rush delivery in Lagos
8. NFC: media types, size limits, how long memory pages stay online, whether buyers can change the message after delivery, which products can take the tag
9. Names (with consent) for the customer moments. The reviews section now carries the old site's six reviews
   word for word (Korede O., Adeola A., Chinaza A., Daniel O., Jackson D., Blessing A.), as agreed, 28 Oct.
   Some mention engraving, gold inlay and gift boxes we don't sell: confirm they are real and still accurate
   before launch
10. Photos for bouquet, magnifying glass, cake, real rose and NFC tag (left as drawn placeholders for the
    demo, 28 Oct)
11. About text (Our story, What inspires us), FAQ answers, policy details, opening hours, business email.
    The draft policies include details we assumed and the client must confirm or change: damage or
    mistakes reported within 48 hours with a photo; cancellation with a full refund only before crafting
    starts; the rider calls the recipient, and a second delivery attempt may carry a fee; data requests
    answered within 30 days. The privacy policy also needs a Nigerian data protection practitioner's review.
12. Who on their team uses the admin panel, and how many staff accounts
