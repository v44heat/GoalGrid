import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. It bypasses Row Level Security, so it must only be used
 * in server code, and only AFTER the caller has been authorised.
 * `server-only` makes the build fail if this is ever imported into a client component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role configuration is missing.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
