import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AuditEntity = "player" | "team" | "season" | "participant" | "fixture" | "result";

export interface AuditEntry {
  /** dotted verb, e.g. "player.approve" */
  action: string;
  entity: AuditEntity;
  entityId?: string | null;
  /** one readable sentence. Usernames only: never put emails, passwords or keys in here. */
  summary: string;
  details?: Record<string, unknown>;
  /** when given, the season's name is appended to the summary */
  seasonId?: string;
}

/**
 * Records an admin action. The database function stamps the real signed-in admin as the actor,
 * so the caller cannot spoof who did it. Logging is best-effort: a failure is reported to the
 * server log but never blocks the admin's action (result changes are logged inside the database
 * itself, in the same transaction, so those can't be missed).
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createClient();
    let summary = entry.summary;
    let details: Record<string, unknown> = entry.details ?? {};

    if (entry.seasonId) {
      const { data } = await supabase.from("seasons").select("name").eq("id", entry.seasonId).maybeSingle();
      if (data?.name) summary = `${summary} (${data.name})`;
      details = { ...details, season_id: entry.seasonId };
    }

    const { error } = await supabase.rpc("log_admin_action", {
      p_action: entry.action,
      p_entity_type: entry.entity,
      p_entity_id: entry.entityId ?? null,
      p_summary: summary,
      p_details: details,
    });
    if (error) console.error("audit log write failed:", error.message);
  } catch (err) {
    console.error("audit log write failed:", err);
  }
}
