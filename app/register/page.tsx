import { Construction } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Register" };

export default function Page() {
  return (
    <>
      <PageHeader title="Register" />
      <EmptyState
        icon={Construction}
        title="Not built yet"
        description="This page arrives in a later phase."
      />
    </>
  );
}
