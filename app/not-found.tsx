import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Page not found"
      description="That page doesn't exist or has moved."
      action={
        <Link href="/">
          <Button>Back to home</Button>
        </Link>
      }
    />
  );
}
