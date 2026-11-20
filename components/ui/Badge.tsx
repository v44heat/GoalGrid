import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-turf-700 text-chalk-dim",
  success: "bg-grass/15 text-grass",
  warning: "bg-gold/15 text-gold",
  danger: "bg-card/15 text-[#ff7b80]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
