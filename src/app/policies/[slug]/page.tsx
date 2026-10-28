import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/layout/ComingSoon";

const POLICIES = {
  delivery: "Delivery",
  refunds: "Refunds and remakes",
  privacy: "Privacy",
  terms: "Terms of sale",
} as const;

export const metadata: Metadata = { title: "Policies", robots: { index: false } };

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export default async function Page({ params }: PageProps<"/policies/[slug]">) {
  const { slug } = await params;
  const title = POLICIES[slug as keyof typeof POLICIES];
  if (!title) notFound();
  return <ComingSoon title={title} note="This policy is being finalised with Woodspeaks." />;
}
