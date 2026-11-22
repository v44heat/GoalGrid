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

/** 01 Dec 2026 */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
