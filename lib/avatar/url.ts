/**
 * Public URL of a profile picture. Only the storage path is kept in the database, so a picture
 * can never point at anybody else's website. Works in server and client code.
 */
export function avatarUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/avatars/${path}`;
}
