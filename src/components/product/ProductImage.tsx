import type { Product } from "@/lib/types";
import { imageSrc } from "@/lib/media";
import { CATEGORY_TONE } from "./tones";

/**
 * Two kinds of product photo:
 * - products/<slug>-cutout: the product cut out on a transparent background, set on
 *   the card's tone with a soft drawn shadow.
 * - products/<slug>: a full styled photo (the client's moody table shots), filling the frame.
 * Placeholder until either exists.
 */
export function ProductImage({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const cutout = imageSrc(`products/${product.slug}-cutout`);
  const photo = cutout ? null : imageSrc(`products/${product.slug}`);
  return (
    <div
      className={`relative isolate aspect-[4/5] overflow-hidden bg-gradient-to-b ${CATEGORY_TONE[product.category].image} ${className}`}
     
    >
      {cutout ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cutout}
          alt={product.imageAlt || product.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain p-[8%] drop-shadow-[0_16px_14px_rgb(42_23_18/0.28)] transition-transform duration-700 ease-quill group-hover:scale-[1.04]"
        />
      ) : photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={product.imageAlt || product.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-quill group-hover:scale-[1.04]"
        />
      ) : (
        <>
          <div aria-hidden className="absolute bottom-[16%] left-1/2 h-[5%] w-[55%] -translate-x-1/2 rounded-[50%] bg-ink/20 blur-lg" />
          <span className="absolute inset-x-0 top-[40%] px-5 text-center font-display text-lg text-ink/55 italic sm:text-xl">
            {product.name}
          </span>
        </>
      )}
    </div>
  );
}
