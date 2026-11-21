import { Badge } from "@/components/ui/Badge";
import type { SeasonStatus } from "@/types/database";

const TONE = {
  DRAFT: "neutral",
  ACTIVE: "success",
  COMPLETED: "warning",
  ARCHIVED: "neutral",
} as const;

export function SeasonStatusBadge({ status }: { status: SeasonStatus }) {
  return <Badge tone={TONE[status]}>{status.toLowerCase()}</Badge>;
}
