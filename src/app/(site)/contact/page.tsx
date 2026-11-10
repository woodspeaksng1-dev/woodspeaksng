import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ContactForm } from "@/components/contact/ContactForm";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description:
    "Message Woodspeaks on WhatsApp, Instagram or by email for help choosing or personalising a gift.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-28 sm:px-6">
      <h1 className="text-5xl text-oxblood md:text-6xl">Contact</h1>
      <p className="mt-6 max-w-lg text-lg text-ink-soft">
        Questions about a gift, a bulk order or a delivery? Message us and we&rsquo;ll help.
      </p>
      <ul className="mt-10 divide-y divide-rule border-y border-rule">
        <li className="flex flex-wrap items-center justify-between gap-3 py-5">
          <span className="text-ink-soft">WhatsApp</span>
          <a href={CONTACT.whatsappUrl()} className="-my-2 py-2 font-display text-xl text-oxblood hover:underline" rel="noopener">
            {CONTACT.phoneDisplay}
          </a>
        </li>
        <li className="flex flex-wrap items-center justify-between gap-3 py-5">
          <span className="text-ink-soft">Instagram</span>
          <a href={CONTACT.instagramUrl} className="-my-2 py-2 font-display text-xl text-oxblood hover:underline" rel="noopener">
            {CONTACT.instagramHandle}
          </a>
        </li>
      </ul>
      <div className="mt-12">
        <ContactForm />
      </div>
    </div>
  );
}
