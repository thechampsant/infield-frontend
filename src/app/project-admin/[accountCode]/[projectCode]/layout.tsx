"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/shell/console-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { projectAdminNav } from "@/lib/nav/nav";
import { useAuth } from "@/lib/auth/auth-context";

export default function ProjectAdminLayout({
  params,
  children,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
  children: React.ReactNode;
}) {
  const { accountCode, projectCode } = use(params);
  const router = useRouter();
  const { user, logout } = useAuth();

  const sections = projectAdminNav(accountCode, projectCode);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <ProtectedRoute>
      <ConsoleShell
        brandTitle="Singularity"
        brandSubtitle="Alpha Corp - Retail"
        sections={sections}
        breadcrumbs={[
          { label: "Projects", href: "/account-admin" },
          {
            label: "Alpha Corp - Retail",
            href: `/project-admin/${accountCode}/${projectCode}`,
          },
          { label: "Master Data" },
        ]}
        user={{
          name: user?.email?.split("@")[0] || "Admin",
          role: "Project Admin",
        }}
        onLogout={handleLogout}
      >
        {children}
      </ConsoleShell>
    </ProtectedRoute>
  );
}
