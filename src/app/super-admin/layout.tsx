"use client";

import { useRouter } from "next/navigation";
import { MasterShell } from "@/components/shell/master-shell";
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
      <MasterShell
        sections={superAdminNav}
        homeHref="/super-admin/accounts"
        user={{
          name: user?.email?.split("@")[0] || "Super Admin",
          role: "V5 Global · Admin",
        }}
        onLogout={handleLogout}
      >
        {children}
      </MasterShell>
    </ProtectedRoute>
  );
}
