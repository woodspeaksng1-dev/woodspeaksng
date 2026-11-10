import { getPublicReviews } from "@/lib/server/reviews";
import type { Product } from "@/lib/types";
import { ReviewCard } from "../home/Reviews";

/** Reviews about this product, if any. Nothing at all when there are none. */
export async function ProductReviews({ product }: { product: Product }) {
  const reviews = (await getPublicReviews()).filter((r) => r.productId === product.id);
  if (reviews.length === 0) return null;
  return (
    <section className="md:col-span-2 md:pt-8" aria-labelledby="product-reviews">
      <h2 id="product-reviews" className="text-3xl text-ink md:text-4xl">
        What buyers said
      </h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <li key={r.id}>
            <ReviewCard review={r} product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
