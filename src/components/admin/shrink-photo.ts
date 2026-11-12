/*
 * Shrinks a photo in the browser before upload (longest side MAX_EDGE, WebP or JPEG), so a 6 MB phone
 * photo goes up as a few hundred KB: quick on mobile data and light for buyers. The server checks it again.
 */

const MAX_EDGE = 1600;

export async function shrinkPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This browser can't open that photo. Choose a JPG or PNG (iPhone photos: share as JPG, or use Safari).");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
  // WebP keeps transparent cut-outs; browsers that can't make WebP give back PNG, so fall back to JPEG.
  const webp = await encode("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg");
  if (!blob) throw new Error("That photo couldn't be prepared. Try another.");
  return blob;
}
