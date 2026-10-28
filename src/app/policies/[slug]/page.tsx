import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { POLICIES, type Policy, type PolicySlug } from "@/lib/policies";

const getPolicy = (slug: string): Policy | undefined => POLICIES[slug as PolicySlug];

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) return {};
  const meta = pageMeta({ title: policy.title, description: policy.summary, path: `/policies/${slug}` });
  // Drafts stay out of search until Woodspeaks approves them.
  return policy.draft ? { ...meta, robots: { index: false } } : meta;
}

export default async function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 pt-8 pb-28 sm:px-6">
      <h1 className="text-5xl text-oxblood md:text-6xl">{policy.title}</h1>
      <p className="mt-6 text-lg text-ink-soft">{policy.summary}</p>
      {policy.draft && (
        <p className="mt-6 rounded-xl border border-rule bg-vellum px-4 py-3 text-sm text-ink-soft">
          This policy is being finalised and may change before our new site launches.
        </p>
      )}
      {policy.sections.map((s) => (
        <section key={s.heading} className="mt-12">
          <h2 className="text-3xl text-oxblood">{s.heading}</h2>
          {s.body.map((para, i) => (
            <p key={i} className="mt-4 text-lg text-ink">
              {para}
            </p>
          ))}
        </section>
      ))}
      <nav aria-label="Other policies" className="mt-16 border-t border-rule pt-8">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {(Object.keys(POLICIES) as PolicySlug[])
            .filter((s) => s !== slug)
            .map((s) => (
              <li key={s}>
                <Link href={`/policies/${s}`} className="text-oxblood underline decoration-gold/60 underline-offset-4 hover:decoration-oxblood">
                  {POLICIES[s].title}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </article>
  );
}
