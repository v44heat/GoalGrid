/** Adds days to an ISO date string (YYYY-MM-DD) without timezone surprises. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Today as YYYY-MM-DD in the league's timezone (the server itself runs in UTC). */
export function todayInLeagueTimezone(timeZone = "Africa/Nairobi"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** "Today", "Tomorrow", "Yesterday", otherwise "07 Dec 2026". Both arguments are YYYY-MM-DD. */
export function relativeDayLabel(iso: string, todayIso: string): string {
  const days = Math.round(
    (new Date(`${iso}T00:00:00Z`).getTime() - new Date(`${todayIso}T00:00:00Z`).getTime()) / 86_400_000
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return formatDate(iso);
}

/** 01 Dec 2026 */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
