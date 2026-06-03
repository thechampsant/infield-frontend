"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatApiError, getAdminApi } from "@/lib/api";
import { authService } from "@/lib/api/auth-service";
import { resolveAccountScope } from "@/lib/auth/account-scope";
import type { Project } from "@/lib/api/types";

export interface ProjectContextValue {
  accountCode: string;
  projectCode: string;
  projectId: string;
  projectName: string;
  accountName: string;
  loading: boolean;
  error: string | null;
  backHref: string;
  refresh: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function resolveBackHref(role: string | undefined): string {
  const normalized = (role ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (
    normalized.includes("clientadmin") ||
    normalized.includes("accountadmin")
  ) {
    return "/account-admin/projects";
  }
  return "/super-admin/accounts";
}

export function ProjectContextProvider({
  accountCode,
  projectCode,
  children,
}: {
  accountCode: string;
  projectCode: string;
  children: ReactNode;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [accountName, setAccountName] = useState("");
  const [backHref, setBackHref] = useState("/super-admin/accounts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getAdminApi();
      const [found, profile] = await Promise.all([
        api.getProjectByCode(projectCode),
        authService.getMe().catch(() => null),
      ]);

      setProject(found);
      setBackHref(resolveBackHref(profile?.role));

      const scope = resolveAccountScope(profile);
      if (scope.accountName) {
        setAccountName(scope.accountName);
      } else if (found.accountCode || accountCode) {
        try {
          const code = found.accountCode || accountCode;
          const accounts = await api.listAccounts({ pageSize: 200 });
          const match = accounts.items.find((a) => a.code === code);
          if (match) setAccountName(match.name);
          else setAccountName(code);
        } catch {
          setAccountName(found.accountCode || accountCode);
        }
      }
    } catch (err) {
      setError(formatApiError(err, "Failed to load project"));
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [accountCode, projectCode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      accountCode,
      projectCode,
      projectId: project?.id ?? "",
      projectName: project?.name ?? projectCode,
      accountName: accountName || accountCode,
      loading,
      error,
      backHref,
      refresh,
    }),
    [
      accountCode,
      projectCode,
      project,
      accountName,
      loading,
      error,
      backHref,
      refresh,
    ],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProjectContext must be used within ProjectContextProvider");
  }
  return ctx;
}
