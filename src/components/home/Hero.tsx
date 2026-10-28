import Link from "next/link";
import { imageSrc } from "@/lib/media";
import { HeroStage } from "./HeroStage";
import { HeroMoment } from "./HeroMoment";
import { WaxSeal } from "./WaxSeal";

/*
 * The product is the centre of the page. Words sit to its left (above it on phones),
 * the seal is pressed just below it, and one real customer moment sits to the side.
 */
export function Hero() {
  const seal = imageSrc("seal/stamp");
  return (
    <section className="relative isolate overflow-hidden bg-parchment" aria-labelledby="hero-title">
      <div className="mx-auto max-w-7xl px-4 pt-3 pb-16 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,560px)_minmax(0,0.8fr)] lg:items-center lg:gap-x-10 lg:px-10 lg:pt-2 lg:pb-24">
        <div className="lg:pb-16">
          <h1 id="hero-title" className="text-[clamp(2.65rem,11.5vw,3.5rem)] text-ink lg:text-[clamp(3rem,4.1vw,4rem)]">
            Gifts that speak louder than words
          </h1>
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 lg:block">
            <p className="max-w-[24ch] text-[0.86rem] leading-relaxed text-ink-soft sm:text-[0.95rem] lg:max-w-[30ch] lg:text-base">
              Scrolls and keepsakes carrying your own words, made by hand in Lagos.
            </p>
            <p className="text-right font-display text-lg leading-tight text-oxblood italic lg:hidden">
              A place
              <br />
              for emotions.
            </p>
          </div>
          <Link
            href="/shop"
            className="mt-8 hidden items-center gap-3 text-ink underline decoration-gold decoration-1 underline-offset-[7px] hover:text-oxblood lg:inline-flex"
          >
            See all gifts
          </Link>
        </div>

        <div className="relative mx-auto mt-2 w-full max-w-[400px] sm:max-w-[470px] lg:mt-0 lg:max-w-none">
          <HeroStage />
          <WaxSeal
            image={seal}
            className="absolute bottom-[-17%] left-1/2 h-28 w-28 -translate-x-1/2 sm:h-32 sm:w-32 lg:bottom-[-14%] lg:h-36 lg:w-36"
          />
        </div>

        <div className="mt-24 flex justify-center lg:mt-0 lg:flex-col lg:items-end lg:justify-end lg:self-end lg:pb-4">
          <p className="mb-6 hidden max-w-[16ch] text-right font-display text-2xl leading-tight text-oxblood italic lg:block">
            A place for emotions.
          </p>
          <HeroMoment className="w-full max-w-[400px] lg:max-w-none" />
        </div>
      </div>
    </section>
  );
}
