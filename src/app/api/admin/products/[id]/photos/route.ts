import { revalidateTag } from "next/cache";
import { z } from "zod";
import { CATALOG_TAG } from "@/lib/server/catalog";
import { PHOTO_FILE, PHOTO_ROUTE, PRODUCT_PHOTO_MAX_BYTES, addProductPhoto, arrangeProductPhoto } from "@/lib/server/product-photos";
import { requireStaffRequest } from "@/lib/server/staff";

/*
 * Staff only. A product's other photos, after the main one (which ../photo sets).
 * POST (body: the photo's bytes, already shrunk by the browser): adds one at the end.
 * PATCH { image, move: "up" | "down" | "main" | "remove" }: moves one, makes it the main photo, or removes it.
 * The shop's cached catalog is refreshed straight away.
 */

const productId = z.string().regex(/^[a-z0-9-]{1,64}$/);
const arrangement = z.object({
  image: z.string().refine((v) => v.startsWith(PHOTO_ROUTE) && PHOTO_FILE.test(v.slice(PHOTO_ROUTE.length)), "That photo isn't one of ours."),
  move: z.enum(["up", "down", "main", "remove"]),
});

export async function POST(request: Request, { params }: RouteContext<"/api/admin/products/[id]/photos">) {
  const check = await requireStaffRequest(request);
  if (!check.ok) return check.response;
  const id = productId.safeParse((await params).id);
  if (!id.success) return Response.json({ message: "That product doesn't exist." }, { status: 404 });
  if (Number(request.headers.get("content-length") ?? 0) > PRODUCT_PHOTO_MAX_BYTES)
    return Response.json({ message: "That photo is too large. Try a smaller one." }, { status: 413 });

  const bytes = new Uint8Array(await request.arrayBuffer());
  try {
    const result = await addProductPhoto(check.staff, id.data, bytes);
    if (result.ok) revalidateTag(CATALOG_TAG, { expire: 0 });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error(`Adding a photo to ${id.data} failed.`, error);
    return Response.json({ message: "The photo couldn't be saved. Try again in a minute." }, { status: 502 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/products/[id]/photos">) {
  const check = await requireStaffRequest(request);
  if (!check.ok) return check.response;
  const id = productId.safeParse((await params).id);
  if (!id.success) return Response.json({ message: "That product doesn't exist." }, { status: 404 });
  const body = arrangement.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ message: "That photo isn't on this product." }, { status: 400 });

  const result = await arrangeProductPhoto(check.staff, id.data, body.data.image, body.data.move);
  if (result.ok) revalidateTag(CATALOG_TAG, { expire: 0 });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
