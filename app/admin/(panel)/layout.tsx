import { AdminStoreProvider } from "@/context/AdminStoreContext";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
import { AuthProvider } from "@/components/providers/AuthProvider";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminStoreProvider>
        <AdminLayoutShell>{children}</AdminLayoutShell>
      </AdminStoreProvider>
    </AuthProvider>
  );
}
