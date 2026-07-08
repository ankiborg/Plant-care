// Shared photo-size limit, checked in the browser before uploading and again
// on the server. Cloudinary's free plan caps images at 10 MB, so 8 MB leaves
// headroom for the multipart envelope.
export const MAX_PHOTO_MB = 8;

export function photoTooLargeMessage(sizeBytes: number): string {
  const mb = (sizeBytes / (1024 * 1024)).toFixed(1);
  return `That photo is ${mb} MB — the limit is ${MAX_PHOTO_MB} MB. Try a smaller photo, or lower your camera's picture size.`;
}
