// Client-only: turns any photo into a small square JPEG before upload.
// Phone photos are several MB; this makes them about 20-40 KB, and re-encoding through a canvas
// also strips EXIF data such as the location a photo was taken.
import { AVATAR_SIZE, computeCrop } from "./process";

export async function photoToAvatarBlob(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That image couldn't be read."));
      el.src = url;
    });

    const { sx, sy, size } = computeCrop(img.naturalWidth, img.naturalHeight);
    if (size < 32) throw new Error("That image is too small.");

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser can't process images.");
    ctx.fillStyle = "#0b1d14"; // JPEG has no transparency; transparent PNGs get the site background
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process the image."))), "image/jpeg", 0.85)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
