"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Shield } from "lucide-react";
import { MAIN_NAV, APP_NAME } from "@/lib/constants";
import { cn } from "@/utils/cn";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-turf-700 bg-turf-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight"
          onClick={() => setOpen(false)}
        >
          {APP_NAME}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-turf-700 text-grass"
                  : "text-chalk-dim hover:text-chalk"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg border border-turf-600 px-4 py-2 text-sm hover:bg-turf-800 sm:inline-block"
          >
            Log in
          </Link>
          <Link
            href="/admin"
            aria-label="Admin"
            className="hidden rounded-lg p-2 text-chalk-faint hover:text-chalk sm:inline-block"
          >
            <Shield className="h-5 w-5" />
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 hover:bg-turf-800 lg:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="Mobile"
          className="border-t border-turf-700 bg-turf-900 px-4 py-3 lg:hidden"
        >
          <ul className="grid grid-cols-2 gap-1">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-3 text-base",
                    isActive(item.href)
                      ? "bg-turf-700 text-grass"
                      : "text-chalk-dim"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-3 text-base text-chalk-dim"
              >
                Log in
              </Link>
            </li>
            <li>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-3 text-base text-chalk-dim"
              >
                Admin
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
