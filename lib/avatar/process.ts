// Pure helpers for profile pictures. No imports on purpose (see scripts/verify-account.mjs).

export const AVATAR_SIZE = 256; // pixels, square
export const AVATAR_MAX_BYTES = 300 * 1024; // matches the storage bucket limit

/** Largest centred square inside a width x height image. */
export function computeCrop(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height);
  return { sx: Math.floor((width - size) / 2), sy: Math.floor((height - size) / 2), size };
}

/** JPEG files start with FF D8 FF. The server checks this instead of trusting the browser's claim. */
export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}
