import Link from "next/link";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ProductImage } from "../product/ProductImage";
import { AdminHeader, Badge } from "./AdminShell";

export function ProductsList({ products }: { products: Product[] }) {
  return (
    <div>
      <AdminHeader title="Products" intro="Edit prices, descriptions, tags and personalisation limits. Changes show in the shop straight away; hidden products don't show at all." />
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <li key={p.id}>
            <Link
              href={`/admin/products/${p.slug}`}
              className="flex items-center gap-4 rounded-2xl bg-vellum p-3 shadow-card transition-colors hover:ring-1 hover:ring-oxblood"
            >
              <ProductImage product={p} className="w-16 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-lg">{p.name}</span>
                <span className="block text-sm text-ink-soft tabular-nums">{formatNaira(p.price)}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {p.featured && <Badge tone="gold">On home page</Badge>}
                  {p.hidden && <Badge tone="quiet">Hidden</Badge>}
                  {p.addOn && <Badge tone="quiet">Add-on</Badge>}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
