import type { Metadata } from "next";
import { PRODUCTS, getProductBySlug } from "@/lib/catalog";
import { ProductEditor } from "@/components/admin/ProductEditor";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/admin/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: getProductBySlug(slug)?.name ?? "Product" };
}

export default async function AdminProductPage({ params }: PageProps<"/admin/products/[slug]">) {
  const { slug } = await params;
  return <ProductEditor slug={slug} />;
}
