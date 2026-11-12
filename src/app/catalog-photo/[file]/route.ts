import { readProductPhoto } from "@/lib/server/product-photos";

/*
 * GET /catalog-photo/<file>: a product photo uploaded in admin, from the private bucket. Each upload has
 * its own name, so the reply is cached for a year by browsers and Vercel's CDN: storage is read about once
 * per photo, not once per visitor.
 */
export async function GET(_request: Request, { params }: RouteContext<"/catalog-photo/[file]">) {
  const { file } = await params;
  let photo;
  try {
    photo = await readProductPhoto(file);
  } catch (error) {
    console.error(`Catalog photo ${file} couldn't be read.`, error);
    return new Response("Try again", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!photo) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
