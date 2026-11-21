export function validateSeasonName(value: string): string | null {
  if (value.length < 3 || value.length > 60) return "Use 3 to 60 characters.";
  return null;
}

export function validateTeamName(value: string): string | null {
  if (value.length < 2 || value.length > 40) return "Use 2 to 40 characters.";
  return null;
}

export function validateShortName(value: string): string | null {
  if (!/^[A-Za-z0-9]{2,4}$/.test(value)) return "Use 2 to 4 letters or numbers.";
  return null;
}

export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function validateLogoFile(file: File): string | null {
  if (!(file.type in LOGO_TYPES)) return "Logo must be a PNG, JPG or WebP image.";
  if (file.size > LOGO_MAX_BYTES) return "Logo must be 1 MB or smaller.";
  return null;
}
