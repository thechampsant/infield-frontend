"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MasterShell } from "@/components/shell/master-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { accountAdminNav } from "@/lib/nav/nav";
import { useAuth } from "@/lib/auth/auth-context";
import { authService } from "@/lib/api/auth-service";
import { resolveAccountScope } from "@/lib/auth/account-scope";

export default function AccountAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const fallbackName = user?.email?.split("@")[0] || "Account Admin";
  const [chip, setChip] = useState<{ name: string; role: string }>({
    name: fallbackName,
    role: "Account Admin",
  });

  useEffect(() => {
    let active = true;
    authService
      .getMe()
      .then((profile) => {
        if (!active) return;
        const p = profile as unknown as Record<string, unknown>;
        const first = typeof p.firstName === "string" ? p.firstName : "";
        const last = typeof p.lastName === "string" ? p.lastName : "";
        const fullName = `${first} ${last}`.trim();
        const email = typeof p.email === "string" ? p.email : "";
        const name = fullName || email.split("@")[0] || "Account Admin";

        const { accountName } = resolveAccountScope(profile);
        const role = accountName ? `${accountName} · Admin` : "Account Admin";

        setChip({ name, role });
      })
      .catch(() => {
        // Keep the fallback chip on failure.
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <ProtectedRoute>
      <MasterShell
        sections={accountAdminNav}
        brandTag="Account Admin"
        homeHref="/account-admin/projects"
        user={chip}
        onLogout={handleLogout}
      >
        {children}
      </MasterShell>
    </ProtectedRoute>
  );
}
