import { AdminStoreProvider } from "@/context/AdminStoreContext";
import { AuthProvider } from "@/components/providers/AuthProvider";

// Print pages live outside the (panel) route group so they render without the
// admin shell, but they still read orders from the admin store.
export default function AdminPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminStoreProvider>{children}</AdminStoreProvider>
    </AuthProvider>
  );
}
