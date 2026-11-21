"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

// Sections are added here as later phases build them.
const ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/teams", label: "Teams" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="mb-8 flex gap-1 overflow-x-auto border-b border-turf-700 pb-3">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-4 py-2 text-sm",
              active ? "bg-turf-700 text-grass" : "text-chalk-dim hover:text-chalk"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
