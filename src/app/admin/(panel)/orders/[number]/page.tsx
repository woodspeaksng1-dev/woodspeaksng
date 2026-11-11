import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderDetail } from "@/components/admin/OrderDetail";
import { loadOrder } from "@/lib/server/admin-orders";
import { requireStaff } from "@/lib/server/admin-session";
import { downloadLink, uploadIdsOf } from "@/lib/server/uploads";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[number]">): Promise<Metadata> {
  const { number } = await params;
  return { title: number };
}

export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">Loading the order…</p>}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: Pick<PageProps<"/admin/orders/[number]">, "params">) {
  await requireStaff();
  const { number } = await params;
  const order = await loadOrder(number);
  if (!order)
    return (
      <p className="py-20 text-center text-ink-soft">
        There&rsquo;s no order {number}.{" "}
        <Link href="/admin/orders" className="text-oxblood underline">
          Back to orders
        </Link>
      </p>
    );
  // Short-lived links to the buyer's uploaded files (paid orders only).
  const files: Record<string, string> = {};
  if (order.status !== "pending" && order.status !== "cancelled")
    await Promise.all(
      uploadIdsOf(order.lines).map(async (id, i) => {
        const url = await downloadLink(id, `${order.number}-${i + 1}`).catch((error) => (console.error(`Order ${order.number}: no link for ${id}.`, error), null));
        if (url) files[id] = url;
      }),
    );
  return <OrderDetail order={order} files={files} />;
}
