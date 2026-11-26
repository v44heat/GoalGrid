import { avatarUrl } from "@/lib/avatar/url";
import { cn } from "@/utils/cn";

/** A player's picture, or their initial on a coloured disc when they have none. */
export function Avatar({
  name,
  path,
  size = 40,
  className,
}: {
  name: string;
  path: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const url = avatarUrl(path);
  const style = { width: size, height: size };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${name}'s profile picture`}
        width={size}
        height={size}
        loading="lazy"
        style={style}
        className={cn("shrink-0 rounded-full border border-turf-600 object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-turf-600 bg-turf-700 font-display font-bold uppercase text-chalk",
        className
      )}
    >
      {name.charAt(0)}
    </span>
  );
}
