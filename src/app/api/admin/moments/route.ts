import { revalidateTag } from "next/cache";
import { momentInput } from "@/lib/gallery";
import { readCatalog } from "@/lib/server/catalog";
import { MOMENTS_TAG, addMoment } from "@/lib/server/moments";
import { PRODUCT_PHOTO_MAX_BYTES } from "@/lib/server/product-photos";
import { requireStaffRequest } from "@/lib/server/staff";

/*
 * Staff only. POST a new customer moment as a form: photo (already shrunk by the browser), caption, who,
 * productSlug and consent ("yes": the customer agreed to share it). The shop's moments refresh at once.
 * Edits, hiding, ordering and deleting are server actions (admin/(panel)/moments/actions.ts).
 */

const MAX_BODY = PRODUCT_PHOTO_MAX_BYTES + 64 * 1024; // the photo plus the few words that come with it

export async function POST(request: Request) {
  const check = await requireStaffRequest(request);
  if (!check.ok) return check.response;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY)
    return Response.json({ ok: false, message: "That photo is too large. Try a smaller one." }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, message: "That didn't arrive properly. Try again." }, { status: 400 });
  }
  if (form.get("consent") !== "yes")
    return Response.json({ ok: false, message: "Tick that the customer is happy for us to share it." }, { status: 400 });
  const photo = form.get("photo");
  if (!(photo instanceof Blob) || photo.size === 0) return Response.json({ ok: false, message: "Choose a photo." }, { status: 400 });
  const input = momentInput.safeParse({ caption: form.get("caption") ?? "", who: form.get("who") ?? "", productSlug: form.get("productSlug") ?? "" });
  if (!input.success) return Response.json({ ok: false, message: input.error.issues[0]?.message ?? "Check the form." }, { status: 400 });

  try {
    const slugs = new Set((await readCatalog()).products.map((p) => p.slug));
    const result = await addMoment(check.staff, input.data, new Uint8Array(await photo.arrayBuffer()), slugs);
    if (result.ok) revalidateTag(MOMENTS_TAG, { expire: 0 });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("Adding a moment failed.", error);
    return Response.json({ ok: false, message: "The moment couldn't be saved. Try again in a minute." }, { status: 502 });
  }
}
