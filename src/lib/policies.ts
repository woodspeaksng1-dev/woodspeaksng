/*
 * Policy pages. DRAFTS written from docs/PLAN.md (28 Oct 2026) for Woodspeaks to review.
 * The privacy policy must be checked by a Nigerian data protection practitioner (NDPA 2023 / GAID)
 * before launch. While `draft` is true a page shows a notice and stays out of search.
 */

export interface Policy {
  title: string;
  summary: string;
  draft: boolean;
  sections: { heading: string; body: string[] }[];
}

export const POLICIES = {
  delivery: {
    title: "Delivery",
    summary: "Where we deliver, how long it takes and what happens on the day.",
    draft: true,
    sections: [
      {
        heading: "Where we deliver",
        body: [
          "We deliver to areas across Lagos. Checkout lists every area we cover, with its delivery fee, which is added to your order total.",
          "If your area isn't listed, message us before you order and we'll tell you whether we can reach it.",
        ],
      },
      {
        heading: "How long it takes",
        body: [
          "Every gift is made by hand after you order. The product page and checkout show how many days that takes, and at checkout you choose a preferred delivery date from the earliest date we can make it.",
          "We do our best to deliver on the date you choose. If something outside our control causes a delay, such as weather or road closures, we'll contact you straight away.",
        ],
      },
      {
        heading: "Delivery fees",
        body: ["The fee depends on the delivery area and is shown at checkout before you pay."],
      },
      {
        heading: "On the day",
        body: [
          "Our rider calls the recipient before arriving. If nobody is available, we'll arrange a new time with you, and a second delivery may carry a fee.",
          "If you asked us to leave the price out of the package, no price or receipt goes in the box. Your receipt comes to your email.",
        ],
      },
    ],
  },
  refunds: {
    title: "Refunds and remakes",
    summary: "What we do if something isn't right with your gift, and what we can't refund.",
    draft: true,
    sections: [
      {
        heading: "Personalised gifts",
        body: [
          "Personalised gifts are made only for you, so we can't accept returns or give refunds for a change of mind, a change of plans, or because the recipient doesn't want the gift.",
          "We write and print exactly what you enter. Before you add a personalised gift to your cart, you see a full preview and confirm you've checked the spelling. We can't refund or remake a gift because of a mistake in the text or photo you provided, or because a photo you uploaded was low quality.",
        ],
      },
      {
        heading: "Handmade, so no two are the same",
        body: [
          "Every gift is made by hand from natural materials. Wood grain, paper texture, wax colour and small marks of the hand differ from piece to piece and from the photos on this site. These are part of the gift, not faults.",
          "Colours can look different on your screen from how they look in real life.",
          "Flowers and treats are fresh. Blooms, wrapping and decoration can vary with the season, and if a flower isn't available we'll use one of the same or higher value.",
        ],
      },
      {
        heading: "When we'll remake your gift",
        body: [
          "If we make a mistake, such as a word that differs from what you entered, or your gift arrives damaged, we'll make it again and deliver it at no cost. Remaking is how we put things right; we refund only if we can't remake the gift.",
          "Tell us within 24 hours of delivery, on WhatsApp or by email, with your order number and clear photos of the problem and of the packaging it came in. For flowers and treats, tell us on the day of delivery.",
          "Damage must be reported in the packaging it arrived in. We can't accept claims for damage after the gift has been unpacked, used, displayed or handled, or for damage caused after delivery.",
          "We may ask for the gift back before we remake it. A remake is made from your original order; we can't change the words, photo or design.",
          "Each order can be remade once.",
        ],
      },
      {
        heading: "Delivery problems",
        body: [
          "Your gift is delivered once it's handed to the recipient or to someone at the address you gave, and our rider records the handover.",
          "We can't refund or redeliver for free if the address or phone number you gave was wrong or incomplete, or if nobody was available to receive it. A second delivery carries a fee.",
          "The delivery date you choose at checkout is your preferred date. We work hard to meet it, but a late delivery isn't a reason for a refund of the gift. If we're late through our own fault, we'll refund the delivery fee.",
        ],
      },
      {
        heading: "Cancelling an order",
        body: [
          "Message us as soon as possible. If we haven't started making your gift, we'll cancel it and refund you to your original payment method, less the payment processing fee. Once crafting has started, we can't cancel.",
        ],
      },
      {
        heading: "How refunds work",
        body: [
          "When we agree a refund, it goes back to your original payment method, usually within 5 to 10 working days. Refunds are never more than what you paid for the item concerned, and don't include the delivery fee unless the delivery itself was our fault.",
        ],
      },
      {
        heading: "Disputes and misuse",
        body: [
          "Please talk to us before contacting your bank. If you open a chargeback or dispute while we're putting things right, we'll pause the remake or refund until the dispute is closed, and we'll share your order details, preview confirmation and delivery record with our payment provider.",
          "We look at every claim carefully. We may refuse a claim that's false or misleading, and stop taking orders from anyone who makes repeated or dishonest claims.",
          "None of this affects your rights under Nigerian consumer protection law.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy",
    summary: "What we collect, why, who helps us, and your rights.",
    draft: true,
    sections: [
      {
        heading: "Who we are",
        body: [
          "Woodspeaks Limited, Lagos, Nigeria, is responsible for the personal data you give us on this website. This policy follows the Nigeria Data Protection Act 2023.",
        ],
      },
      {
        heading: "What we collect and why",
        body: [
          "To make and deliver your order: your name, email, phone number, the recipient's name and phone number, the delivery address, and the words and photos you add to your gift.",
          "To send gift reminders and updates: your email and the date you ask us to remember, only if you choose “Yes, remind me” after an order, or tick the updates box at checkout. You can stop them from any email or your account.",
          "To keep the site working and safe: basic technical information such as your browser type and IP address.",
        ],
      },
      {
        heading: "Who helps us",
        body: [
          "Paystack processes payments; we never see or store your card details. Google Firebase stores orders and uploads. Vercel hosts the website. Resend sends our emails.",
          "We don't sell your personal data.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "We keep order records for as long as the law requires for accounts and tax. Photos and videos you upload for a gift or an NFC tag are kept only as long as we need them to make and deliver it, then deleted.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask to see, correct or delete your personal data, or object to how we use it. Contact us and we'll reply within 30 days. You can also complain to the Nigeria Data Protection Commission.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of sale",
    summary: "The agreement between you and Woodspeaks when you place an order.",
    draft: true,
    sections: [
      {
        heading: "Your order",
        body: [
          "When you pay, you make an offer to buy. We accept it when we email your order confirmation. Prices are in naira and include the cost of making your gift; delivery is shown separately at checkout.",
        ],
      },
      {
        heading: "Personalisation",
        body: [
          "You're responsible for the words and photos you provide, and for having the right to use them. We may refuse to make a gift whose content is offensive, unlawful or uses someone else's work without permission. If we refuse, we'll refund you in full.",
        ],
      },
      {
        heading: "Handmade items",
        body: [
          "Every piece is made by hand, so small differences in colour, grain and finish from the photos are part of its character and aren't faults.",
        ],
      },
      {
        heading: "Delivery, refunds and remakes",
        body: ["Our delivery policy and our refunds and remakes policy form part of these terms."],
      },
    ],
  },
  "acceptable-use": {
    title: "Acceptable use",
    summary: "Rules for the photos and videos you upload.",
    draft: true,
    sections: [
      {
        heading: "What you can upload",
        body: [
          "Photos and videos for your gift or NFC tag that you made, or have permission to use, and that the people in them would be happy to have shared with the recipient.",
        ],
      },
      {
        heading: "What you can't upload",
        body: [
          "Anything unlawful, sexually explicit, violent, hateful or harassing; anything that shares someone else's private information without their consent; or anything that copies someone else's work without permission.",
        ],
      },
      {
        heading: "How we check",
        body: [
          "Our team reviews every upload before it goes on a gift. If an upload breaks these rules, we'll ask you to replace it, and we may cancel the order and refund you.",
        ],
      },
    ],
  },
} satisfies Record<string, Policy>;

export type PolicySlug = keyof typeof POLICIES;
