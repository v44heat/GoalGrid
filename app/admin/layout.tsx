import { requireAdmin } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";

// Server-side role check for every /admin page, independent of the middleware.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
