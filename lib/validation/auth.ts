export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateUsername(value: string): string | null {
  if (!USERNAME_RE.test(value)) {
    return "Use 3 to 20 letters, numbers or underscores.";
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (value.length > 254 || !EMAIL_RE.test(value)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return "Use at least 8 characters.";
  if (value.length > 72) return "Use 72 characters or fewer.";
  return null;
}

/** Only allow redirects to paths inside this site. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
