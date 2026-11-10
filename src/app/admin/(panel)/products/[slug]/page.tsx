import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { findProductBySlug } from "@/lib/catalog";
import { requireStaff } from "@/lib/server/admin-session";
import { readCatalog } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Edit product" };

export default function AdminProductPage({ params }: PageProps<"/admin/products/[slug]">) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading the product…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: Pick<PageProps<"/admin/products/[slug]">, "params">) {
  await requireStaff();
  const { slug } = await params;
  const product = findProductBySlug(await readCatalog(), slug);
  if (!product)
    return (
      <p className="py-20 text-center text-ink-soft">
        Product not found.{" "}
        <Link href="/admin/products" className="text-oxblood underline">
          All products
        </Link>
      </p>
    );
  return <ProductEditor product={product} />;
}
