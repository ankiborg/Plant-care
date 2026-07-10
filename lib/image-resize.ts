// Client-side downscaling for oversized photos. Phone photos are often ~9 MB,
// just over the 8 MB upload cap — instead of rejecting them, shrink in the
// browser before upload. Files at or under the threshold pass through
// untouched, so smaller photos keep their original quality.

import { MAX_PHOTO_MB } from "./photo-limits";

// Resize anything that wouldn't clear the cap with some margin.
const RESIZE_THRESHOLD_BYTES = (MAX_PHOTO_MB - 1) * 1024 * 1024; // 7 MB

/**
 * Fit (width × height) inside maxDim on the longest side, preserving aspect
 * ratio. Never upscales. Pure — unit-tested without a DOM.
 */
export function pickScaledDimensions(
  width: number,
  height: number,
  maxDim: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDim) return { width, height };
  const scale = maxDim / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function drawToJpeg(
  bitmap: ImageBitmap,
  maxDim: number,
  quality: number
): Promise<Blob | null> {
  const { width, height } = pickScaledDimensions(
    bitmap.width,
    bitmap.height,
    maxDim
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
}

/**
 * Return the file as-is when it's small enough, otherwise a downscaled JPEG.
 * If the browser can't decode the image, the original is returned unchanged —
 * the regular size check then rejects it exactly like before.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= RESIZE_THRESHOLD_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    try {
      // 2048 px is plenty for both AI identification and the photo gallery.
      let blob = await drawToJpeg(bitmap, 2048, 0.85);
      if (blob && blob.size > RESIZE_THRESHOLD_BYTES) {
        blob = await drawToJpeg(bitmap, 1600, 0.75);
      }
      if (!blob) return file;
      const basename = file.name.replace(/\.[^.]+$/, "") || "photo";
      return new File([blob], `${basename}.jpg`, { type: "image/jpeg" });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
