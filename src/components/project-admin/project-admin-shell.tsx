"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { InfieldSplash } from "@/components/brand/infield-splash";
import { ProjectAdminDrawer } from "@/components/project-admin/project-admin-drawer";
import {
  ProjectContextProvider,
  useProjectContext,
} from "@/lib/project-admin/project-context";
import { useAuth } from "@/lib/auth/auth-context";
import { authService } from "@/lib/api/auth-service";

function ProjectAdminShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { logout } = useAuth();
  const ctx = useProjectContext();
  const [userChip, setUserChip] = useState({ name: "Admin", role: "Project Admin" });

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
        const name = fullName || email.split("@")[0] || "Project Admin";
        setUserChip({
          name,
          role: `${ctx.projectName} · Admin`,
        });
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      active = false;
    };
  }, [ctx.projectName]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (ctx.loading) {
    return <InfieldSplash message="Loading project" className="infield-splash-screen--overlay" />;
  }

  if (ctx.error) {
    return (
      <div className="pa-shell page-shell">
        <div className="pa-stage">
          <div className="pa-info-banner" style={{ color: "var(--red)", background: "var(--red-light)", borderColor: "var(--red-mid)" }}>
            {ctx.error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pa-shell page-shell">
      <ProjectAdminDrawer
        accountCode={ctx.accountCode}
        projectCode={ctx.projectCode}
        projectName={ctx.projectName}
        accountName={ctx.accountName}
        backHref={ctx.backHref}
        onLogout={handleLogout}
      />
      <main className="pa-stage" aria-label={`Project admin — ${userChip.role}`}>
        <div className="pa-content-wrap">{children}</div>
      </main>
    </div>
  );
}

export function ProjectAdminShell({
  accountCode,
  projectCode,
  children,
}: {
  accountCode: string;
  projectCode: string;
  children: ReactNode;
}) {
  return (
    <ProtectedRoute>
      <ProjectContextProvider accountCode={accountCode} projectCode={projectCode}>
        <ProjectAdminShellInner>{children}</ProjectAdminShellInner>
      </ProjectContextProvider>
    </ProtectedRoute>
  );
}
