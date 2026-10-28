import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { OurItems } from "@/components/home/OurItems";
import { TrustedBy } from "@/components/home/TrustedBy";
import { MomentsStack } from "@/components/home/MomentsStack";
import { Reviews } from "@/components/home/Reviews";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <Hero />
      <OurItems />
      <TrustedBy />
      <MomentsStack />
      <Reviews />
    </>
  );
}
