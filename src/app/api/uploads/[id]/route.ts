import { sameOrigin } from "@/lib/server/auth-session";
import { allow, clientIp } from "@/lib/server/rate-limit";
import { uploadProgress, uploadsEnabled } from "@/lib/server/uploads";
import { uploadId } from "@/lib/uploads";

/*
 * GET: how much of an upload has arrived ({ received, size, done }), so the browser can carry on after a
 * dropped connection. Ids are random and unguessable; the answer reveals only byte counts.
 */

export async function GET(request: Request, { params }: RouteContext<"/api/uploads/[id]">) {
  if (!uploadsEnabled()) return Response.json({ message: "Uploads aren't on yet." }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin && !sameOrigin(request)) return Response.json({ message: "Request refused." }, { status: 403 });
  const id = uploadId.safeParse((await params).id);
  if (!id.success) return Response.json({ message: "Not found." }, { status: 404 });
  if (!(await allow("upload-progress", clientIp(request.headers), 300, 3600))) return Response.json({ message: "Slow down." }, { status: 429 });
  try {
    const progress = await uploadProgress(id.data);
    if (!progress) return Response.json({ message: "That upload has expired. Choose the file again." }, { status: 404 });
    return Response.json(progress, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`Uploads: couldn't check ${id.data}.`, error);
    return Response.json({ message: "We couldn't check the upload." }, { status: 502 });
  }
}
