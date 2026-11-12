import { revalidateTag } from "next/cache";
import { z } from "zod";
import { CATALOG_TAG } from "@/lib/server/catalog";
import { PRODUCT_PHOTO_MAX_BYTES, removeProductPhoto, saveProductPhoto } from "@/lib/server/product-photos";
import { requireStaffRequest } from "@/lib/server/staff";

/*
 * Staff only. POST (body: the photo's bytes, already shrunk by the browser): sets the product's photo.
 * DELETE: takes it off. The shop's cached catalog is refreshed straight away.
 */

const productId = z.string().regex(/^[a-z0-9-]{1,64}$/);

export async function POST(request: Request, { params }: RouteContext<"/api/admin/products/[id]/photo">) {
  const check = await requireStaffRequest(request);
  if (!check.ok) return check.response;
  const id = productId.safeParse((await params).id);
  if (!id.success) return Response.json({ message: "That product doesn't exist." }, { status: 404 });
  if (Number(request.headers.get("content-length") ?? 0) > PRODUCT_PHOTO_MAX_BYTES)
    return Response.json({ message: "That photo is too large. Try a smaller one." }, { status: 413 });

  const bytes = new Uint8Array(await request.arrayBuffer());
  try {
    const result = await saveProductPhoto(check.staff, id.data, bytes);
    if (result.ok) revalidateTag(CATALOG_TAG, { expire: 0 });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error(`Product photo for ${id.data} failed.`, error);
    return Response.json({ message: "The photo couldn't be saved. Try again in a minute." }, { status: 502 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/admin/products/[id]/photo">) {
  const check = await requireStaffRequest(request);
  if (!check.ok) return check.response;
  const id = productId.safeParse((await params).id);
  if (!id.success) return Response.json({ message: "That product doesn't exist." }, { status: 404 });
  const result = await removeProductPhoto(check.staff, id.data);
  if (result.ok) revalidateTag(CATALOG_TAG, { expire: 0 });
  return Response.json(result, { status: result.ok ? 200 : 404 });
}
