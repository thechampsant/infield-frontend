"use client";

import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/shell/console-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { accountAdminNav } from "@/lib/nav/nav";
import { useAuth } from "@/lib/auth/auth-context";

export default function AccountAdminLayout({
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
        brandSubtitle="Alpha Corp Retail"
        sections={accountAdminNav}
        breadcrumbs={[
          { label: "Alpha Corp Retail", href: "/account-admin" },
          { label: "Projects Dashboard" },
        ]}
        user={{
          name: user?.email?.split("@")[0] || "Admin",
          role: "Account Admin",
        }}
        onLogout={handleLogout}
      >
        {children}
      </ConsoleShell>
    </ProtectedRoute>
  );
}
