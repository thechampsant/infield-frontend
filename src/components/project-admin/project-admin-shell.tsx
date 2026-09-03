"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { InfieldSplash } from "@/components/brand/infield-splash";
import {
  ProjectAdminDrawer,
  type PaProfile,
} from "@/components/project-admin/project-admin-drawer";
import {
  ProjectContextProvider,
  useProjectContext,
} from "@/lib/project-admin/project-context";
import { useAuth } from "@/lib/auth/auth-context";
import { authService } from "@/lib/api/auth-service";
import { ModuleConfigAccessGuard } from "@/components/auth/module-config-access-guard";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Same field fallbacks as MasterShell normalizeProfile; designation may be an object from /users/me. */
export function normalizePaProfile(
  value: unknown,
  projectName: string,
): PaProfile {
  const raw = (value ?? {}) as Record<string, unknown>;
  const first = stringValue(raw.firstName);
  const last = stringValue(raw.lastName);
  const email = stringValue(raw.email);
  const fullName =
    [first, last].filter(Boolean).join(" ") ||
    stringValue(raw.name) ||
    stringValue(raw.fullName) ||
    stringValue(raw.displayName) ||
    email.split("@")[0] ||
    "Project Admin";

  const designationObj = raw.designation;
  const designationFromObj =
    designationObj &&
    typeof designationObj === "object" &&
    !Array.isArray(designationObj)
      ? stringValue((designationObj as Record<string, unknown>).name) ||
        stringValue((designationObj as Record<string, unknown>).roleName)
      : "";

  const designation =
    designationFromObj ||
    stringValue(raw.designation) ||
    stringValue(raw.designationName) ||
    stringValue(raw.jobTitle) ||
    stringValue(raw.role);

  const roleLabel = designation
    ? `${projectName} · ${designation}`
    : `${projectName} · Admin`;

  return {
    name: fullName,
    role: roleLabel,
    email,
    mobile:
      stringValue(raw.mobile) ||
      stringValue(raw.phone) ||
      stringValue(raw.phoneNumber) ||
      stringValue(raw.contactNumber),
    designation,
    dateOfJoining:
      stringValue(raw.doj) ||
      stringValue(raw.dateOfJoining) ||
      stringValue(raw.joiningDate) ||
      stringValue(raw.createdAt),
  };
}

function ProjectAdminShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { logout } = useAuth();
  const ctx = useProjectContext();
  const [profile, setProfile] = useState<PaProfile>({
    name: "Admin",
    role: "Project Admin",
    email: "",
    mobile: "",
    designation: "",
    dateOfJoining: "",
  });

  useEffect(() => {
    let active = true;
    authService
      .getMe()
      .then((response) => {
        if (!active) return;
        setProfile(normalizePaProfile(response, ctx.projectName));
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
        projectId={ctx.projectId}
        projectName={ctx.projectName}
        accountName={ctx.accountName}
        backHref={ctx.backHref}
        onLogout={handleLogout}
        profile={profile}
      />
      <main className="pa-stage" aria-label={`Project admin — ${profile.role}`}>
        <div className="pa-content-wrap">
          <ModuleConfigAccessGuard
            accountCode={ctx.accountCode}
            projectCode={ctx.projectCode}
          >
            {children}
          </ModuleConfigAccessGuard>
        </div>
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
