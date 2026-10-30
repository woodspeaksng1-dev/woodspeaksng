import { getProductBySlug } from "@/lib/catalog";
import { REVIEWS, type Review } from "@/lib/reviews";
import { StarIcon } from "../ui/icons";

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5 text-gold" role="img" aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={`h-4 w-4 ${i < n ? "" : "opacity-25"}`} />
      ))}
    </span>
  );
}

function ReviewCard({ review, featured = false }: { review: Review; featured?: boolean }) {
  const product = review.productSlug ? getProductBySlug(review.productSlug) : undefined;
  const initial = review.placeholder ? "" : review.who.charAt(0);
  return (
    <figure
      className={`flex h-full flex-col rounded-[1.6rem] p-6 shadow-card sm:p-7 ${
        featured ? "bg-oxblood text-vellum" : "bg-vellum text-ink"
      }`}
    >
      {review.rating && <Stars n={review.rating} />}
      <blockquote
        className={`${review.rating ? "mt-5" : ""} flex-1 font-display leading-snug ${featured ? "text-2xl md:text-[1.9rem]" : "text-lg"} ${
          review.placeholder ? "italic opacity-70" : ""
        }`}
      >
        <p>{review.quote}</p>
      </blockquote>
      <figcaption className="mt-7 flex items-center gap-3">
        <span
          aria-hidden
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg ${
            featured ? "bg-vellum/15 text-gold-light" : "bg-parchment text-oxblood"
          }`}
        >
          {initial}
        </span>
        <span className="min-w-0 text-sm">
          <span className="block font-semibold">{review.who}</span>
          <span className={featured ? "text-vellum/70" : "text-ink-soft"}>
            {product ? `Bought the ${product.name}` : (review.role ?? "Customer")}
            {review.verified && " · Verified order"}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/** "What they say about us". Phones: a swipeable row. Desktop: one large review and a grid. */
export function Reviews() {
  const [first, ...rest] = REVIEWS;
  if (!first) return null;
  return (
    <section className="bg-paper-shade/35 py-20 md:py-28" aria-labelledby="reviews">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="reviews" className="text-4xl text-ink md:text-5xl">
            What they say about us
          </h2>
          <p className="max-w-xs text-ink-soft">Words from people who gave a Woodspeaks gift, and the people who got one.</p>
        </div>

        <ul className="-mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
          <li className="w-[84%] shrink-0 snap-center sm:w-[60%] lg:row-span-2 lg:w-auto">
            <ReviewCard review={first} featured />
          </li>
          {rest.map((r) => (
            <li key={r.id} className="w-[84%] shrink-0 snap-center sm:w-[60%] lg:w-auto">
              <ReviewCard review={r} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
