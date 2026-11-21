import { cn } from "@/utils/cn";

/** Shows the team's logo, or a badge with its short name when it has none. */
export function TeamLogo({
  name,
  shortName,
  logoUrl,
  className,
}: {
  name: string;
  shortName: string;
  logoUrl: string | null;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn("h-12 w-12 object-contain", className)}
        loading="lazy"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full bg-turf-600 font-display text-lg font-bold text-chalk",
        className
      )}
    >
      {shortName.slice(0, 3).toUpperCase()}
    </span>
  );
}
