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
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div className="max-w-xs">
          <Link href="/" className="font-display text-3xl text-gold-light italic">
            Woodspeaks
          </Link>
          <p className="mt-4 text-vellum/75">
            A place for emotions. Handcrafted keepsakes made in Lagos, delivered across Nigeria.
          </p>
          <div className="mt-5 flex flex-col text-vellum/90">
            <a href={CONTACT.whatsappUrl()} className="py-2 hover:text-gold-light" rel="noopener">
              WhatsApp {CONTACT.phoneDisplay}
            </a>
            <a href={CONTACT.instagramUrl} className="py-2 hover:text-gold-light" rel="noopener">
              Instagram {CONTACT.instagramHandle}
            </a>
          </div>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h2 className="font-sans text-sm font-semibold text-gold-light">{g.title}</h2>
            <ul className="mt-2 flex flex-col">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-block py-2.5 text-vellum/80 hover:text-vellum">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-vellum/10">
        <p className="mx-auto max-w-7xl px-4 py-6 text-sm text-vellum/60 sm:px-6 lg:px-10">
          © <CopyrightYear /> Woodspeaks Limited
        </p>
      </div>
    </footer>
  );
}
