"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

// Keeps the admin navigation on screen when a section fails, instead of replacing the whole page.
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="This section couldn't load"
      description="Try again. If it keeps failing, check the Supabase connection and that all migrations have been run."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
