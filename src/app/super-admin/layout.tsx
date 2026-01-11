"use client";

import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/shell/console-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { superAdminNav } from "@/lib/nav/nav";
import { useAuth } from "@/lib/auth/auth-context";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <ProtectedRoute>
      <ConsoleShell
        brandTitle="Singularity"
        brandSubtitle="Super Admin Console"
        sections={superAdminNav}
        breadcrumbs={[{ label: "Dashboard" }]}
        projectSelector={{ label: "Platform Management" }}
        user={{
          name: user?.email?.split("@")[0] || "Admin",
          role: "Super Admin",
        }}
        onLogout={handleLogout}
      >
        {children}
      </ConsoleShell>
    </ProtectedRoute>
  );
}
