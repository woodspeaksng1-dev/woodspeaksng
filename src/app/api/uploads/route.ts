import { readCatalog } from "@/lib/server/catalog";
import { sameOrigin } from "@/lib/server/auth-session";
import { allow, clientIp } from "@/lib/server/rate-limit";
import { startUpload, uploadsEnabled } from "@/lib/server/uploads";
import { startUploadSchema } from "@/lib/uploads";

/*
 * POST { productId, kind, contentType, size }: opens a private, resumable upload for one customer file
 * and returns { id, url }. The browser then sends the bytes to `url` (Google), never through us.
 * Anyone shopping can call it, so: our pages only, a per-visitor and a shop-wide daily limit, the
 * product's own size and type limits, and storage fixes the exact size. Unused files go after a week.
 */

const fail = (status: number, message: string) => Response.json({ message }, { status });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, "Request refused.");
  if (!uploadsEnabled()) return fail(503, "Uploads aren't on yet.");

  const parsed = startUploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "We couldn't read that file. Try choosing it again.");

  if (!(await allow("upload-ip", clientIp(request.headers), 30, 3600)) || !(await allow("upload-all", "shop", 1000, 86_400)))
    return fail(429, "Too many files at once. Wait a while and try again, or send it to us on WhatsApp after you pay.");

  try {
    const catalog = await readCatalog();
    const product = catalog.products.find((p) => p.id === parsed.data.productId && !p.hidden);
    if (!product) return fail(400, "That product isn't available.");
    const r = await startUpload(parsed.data, product, new URL(request.url).origin);
    if (!r.ok) return fail(400, r.message);
    return Response.json({ id: r.id, url: r.sessionUri });
  } catch (error) {
    console.error("Uploads: couldn't open an upload.", error);
    return fail(502, "We couldn't start the upload just now.");
  }
}
