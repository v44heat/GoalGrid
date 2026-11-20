"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description="Try again. If it keeps happening, tell the league admin."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
