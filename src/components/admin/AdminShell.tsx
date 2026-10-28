"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/homepage", label: "Homepage" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/delivery", label: "Delivery" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/reminders", label: "Reminders" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/activity", label: "Activity" },
];

/** Staff-only panel chrome. DEMO: open without sign-in and showing sample data until the backend stage. */
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === href : path.startsWith(href));
  return (
    <div className="flex min-h-dvh flex-col bg-parchment">
      <p className="bg-oxblood-deep px-4 py-2 text-center text-sm text-vellum print:hidden">
        Demo admin with sample data. Changes reset when you reload. Staff sign-in arrives with the backend.
      </p>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        <nav aria-label="Admin" className="border-b border-rule md:w-56 md:shrink-0 md:border-r md:border-b-0 print:hidden">
          <div className="flex items-center justify-between px-4 pt-4 md:block md:px-6 md:pt-8">
            <Link href="/admin" className="font-display text-2xl text-oxblood italic">
              Woodspeaks
            </Link>
            <Link href="/" className="text-sm text-ink-soft underline underline-offset-2 md:mt-1 md:block">
              View the shop
            </Link>
          </div>
          <ul className="flex gap-1 overflow-x-auto px-3 py-3 md:mt-6 md:flex-col md:px-3 md:py-0">
            {NAV.map((n) => (
              <li key={n.href} className="shrink-0">
                <Link
                  href={n.href}
                  aria-current={active(n.href) ? "page" : undefined}
                  className={`block rounded-full px-4 py-2 text-sm transition-colors md:rounded-xl ${
                    active(n.href) ? "bg-oxblood text-vellum" : "text-ink hover:bg-vellum"
                  }`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-24 md:px-10 md:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminHeader({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl text-oxblood">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-ink-soft">{intro}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-vellum p-5 shadow-card ${className}`}>{children}</section>;
}

const BADGE = {
  neutral: "bg-paper-shade/60 text-ink",
  wine: "bg-oxblood text-vellum",
  gold: "bg-gold-light/50 text-ink",
  quiet: "bg-transparent text-ink-soft ring-1 ring-rule",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[tone]}`}>{children}</span>;
}

export const adminButton =
  "inline-flex h-10 items-center justify-center rounded-full bg-oxblood px-5 text-sm text-vellum transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:opacity-40";
export const adminButtonQuiet =
  "inline-flex h-10 items-center justify-center rounded-full border border-oxblood px-5 text-sm text-oxblood transition-colors hover:bg-oxblood hover:text-vellum disabled:cursor-not-allowed disabled:opacity-40";
