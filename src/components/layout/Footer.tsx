import Link from "next/link";
import { CONTACT } from "@/lib/contact";

const GROUPS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All gifts" },
      { href: "/corporate", label: "Corporate gifting" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Woodspeaks",
    links: [
      { href: "/about", label: "About us" },
      { href: "/about/gallery", label: "Gallery" },
      { href: "/contact", label: "Contact" },
      { href: "/account", label: "Track an order" },
    ],
  },
  {
    title: "Policies",
    // Full width on phones, its links in two columns, so the footer stays short.
    wide: true,
    links: [
      { href: "/policies/delivery", label: "Delivery" },
      { href: "/policies/refunds", label: "Refunds and remakes" },
      { href: "/policies/privacy", label: "Privacy" },
      { href: "/policies/terms", label: "Terms of sale" },
      { href: "/policies/acceptable-use", label: "Acceptable use" },
    ],
  },
];

// Cached so the year doesn't force every page to render on request.
async function CopyrightYear() {
  "use cache";
  return new Date().getFullYear();
}

export function Footer() {
  return (
    <footer className="bg-oxblood-deep text-vellum">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-12 md:py-16 lg:px-10">
        <div className="col-span-2 max-w-xs md:col-span-1">
          <Link href="/" className="font-display text-3xl text-gold-light italic">
            Woodspeaks
          </Link>
          <p className="mt-3 text-vellum/75 md:mt-4">
            A place for emotions. Handcrafted keepsakes made and delivered in Lagos.
          </p>
          <div className="mt-3 flex flex-col text-vellum/90 md:mt-5">
            <a href={CONTACT.whatsappUrl()} className="py-2 hover:text-gold-light" rel="noopener">
              WhatsApp {CONTACT.phoneDisplay}
            </a>
            <a href={CONTACT.instagramUrl} className="py-2 hover:text-gold-light" rel="noopener">
              Instagram {CONTACT.instagramHandle}
            </a>
          </div>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title} className={"wide" in g ? "col-span-2 md:col-span-1" : undefined}>
            <h2 className="font-sans text-sm font-semibold text-gold-light">{g.title}</h2>
            <ul className={`mt-1 md:mt-2 ${"wide" in g ? "grid grid-cols-2 gap-x-6 md:flex md:flex-col" : "flex flex-col"}`}>
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-block py-2 text-vellum/80 hover:text-vellum md:py-2.5">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-vellum/10">
        <p className="mx-auto max-w-7xl px-4 pt-5 pb-24 text-sm md:py-6 text-vellum/60 sm:px-6 lg:px-10">
          © <CopyrightYear /> Woodspeaks Limited
        </p>
      </div>
    </footer>
  );
}
