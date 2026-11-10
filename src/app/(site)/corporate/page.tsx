import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { TrustedBy } from "@/components/home/TrustedBy";
import { EnquiryForm } from "@/components/corporate/EnquiryForm";

export const metadata: Metadata = pageMeta({
  title: "Corporate gifting",
  description:
    "Handmade, personalised gifts for your team, clients and events, from Woodspeaks in Lagos. Delivered across Lagos.",
  path: "/corporate",
});

const OFFER = [
  {
    title: "For your team",
    text: "Work anniversaries, promotions, end of year. A gift with their name and your words means more than a voucher.",
  },
  {
    title: "For your clients",
    text: "Thank the people who keep your business going with something they'll keep on their desk, not in a drawer.",
  },
  {
    title: "For your events",
    text: "Launches, retreats and celebrations. One message for everyone, or a personal note for each guest.",
  },
];

export default function CorporatePage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 lg:px-10">
        <h1 className="max-w-3xl text-5xl text-oxblood md:text-6xl">Corporate gifting</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">
          Handmade gifts for the people who make your work possible. Tell us how many, when and your budget, and
          we&rsquo;ll come back with ideas and a quote.
        </p>
        <ul className="mt-14 grid gap-8 md:grid-cols-3">
          {OFFER.map((o) => (
            <li key={o.title} className="border-t border-rule pt-6">
              <h2 className="text-2xl text-oxblood">{o.title}</h2>
              <p className="mt-3 text-ink-soft">{o.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <TrustedBy />
      <div className="mx-auto max-w-2xl px-4 pt-20 pb-28 sm:px-6">
        <EnquiryForm />
      </div>
    </>
  );
}
