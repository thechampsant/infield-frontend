"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Folder,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/pill";
import { getAdminApi } from "@/lib/api";
import type { Account, Paginated } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

export default function SuperAdminDashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    totalProjects: 0,
  });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const api = getAdminApi();
        const response: Paginated<Account> = await api.listAccounts({ pageSize: 5 });
        setAccounts(response.items);
        
        const activeCount = response.items.filter((a) => a.status === "Active").length;
        const projectCount = response.items.reduce(
          (sum, a) => sum + (a.projectsActiveCount || 0),
          0
        );
        
        setStats({
          totalAccounts: response.total,
          activeAccounts: activeCount,
          totalProjects: projectCount,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        description="Overview of all accounts and projects across the platform"
        actions={
          <Link href="/super-admin/accounts">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              Create Account
            </Button>
          </Link>
        }
      />

      {/* Stats Cards */}
      <StatCardGrid>
        <StatCard
          label="Total Accounts"
          value={String(stats.totalAccounts)}
          change={{ value: "+12%", label: "from last month", trend: "up" }}
          icon={Building2}
          iconColor="blue"
        />
        <StatCard
          label="Active Accounts"
          value={String(stats.activeAccounts)}
          change={{ value: "", label: "currently active", trend: "up" }}
          icon={TrendingUp}
          iconColor="green"
        />
        <StatCard
          label="Total Projects"
          value={String(stats.totalProjects)}
          change={{ value: "", label: "across all accounts", trend: "up" }}
          icon={Folder}
          iconColor="amber"
        />
        <StatCard
          label="System Health"
          value="100%"
          change={{ value: "", label: "all systems operational", trend: "up" }}
          icon={Users}
          iconColor="green"
        />
      </StatCardGrid>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          title="Manage Accounts"
          description="View, create, and edit accounts"
          href="/super-admin/accounts"
          icon={Building2}
          color="blue"
        />
        <QuickActionCard
          title="Manage Projects"
          description="Configure projects for accounts"
          href="/super-admin/projects"
          icon={Folder}
          color="green"
        />
        <QuickActionCard
          title="Audit Logs"
          description="View system activity logs"
          href="/super-admin/audit-logs"
          icon={Users}
          color="amber"
        />
        <QuickActionCard
          title="Global Settings"
          description="Configure platform settings"
          href="/super-admin/global-settings"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Recent Accounts */}
      <div className="rounded-xl border border-[var(--orca-border)] bg-[var(--orca-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--orca-border)] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--orca-text)]">
              Recent Accounts
            </h3>
            <p className="text-sm text-[var(--orca-text-3)]">
              Latest accounts across the platform
            </p>
          </div>
          <Link href="/super-admin/accounts">
            <Button variant="secondary" size="sm">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--orca-border)]">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Account
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Code
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Projects
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--orca-surface-3)] border-t-[var(--orca-brand)]" />
                      <span className="text-sm text-[var(--orca-text-3)]">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-[var(--orca-text-3)]">
                    No accounts found
                  </td>
                </tr>
              ) : (
                accounts.map((account, index) => (
                  <tr
                    key={account.id || `account-${index}`}
                    className="border-b border-[var(--orca-border-light)] last:border-b-0 hover:bg-[var(--orca-surface-2)] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--orca-brand-4-light)] text-[var(--orca-brand-4)]">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-[var(--orca-text)]">{account.name}</div>
                          <div className="text-xs text-[var(--orca-text-3)]">{account.primaryAdminEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-[var(--orca-text-2)]">{account.code}</span>
                    </td>
                    <td className="px-5 py-3 text-[var(--orca-text-2)]">
                      {account.projectsActiveCount} projects
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={account.status === "Active" ? "active" : "inactive"} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "amber" | "purple";
}) {
  const colorClasses = {
    blue: "bg-[var(--orca-brand-light)] text-[var(--orca-brand)]",
    green: "bg-[var(--orca-brand-2-light)] text-[var(--orca-brand-2)]",
    amber: "bg-[var(--orca-brand-3-light)] text-[var(--orca-brand-3)]",
    purple: "bg-[var(--orca-brand-4-light)] text-[var(--orca-brand-4)]",
  };

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-[var(--orca-border)] bg-[var(--orca-surface)] p-5 transition-all hover:border-[var(--orca-brand)]/30 hover:shadow-lg"
      )}
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", colorClasses[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="font-semibold text-[var(--orca-text)] group-hover:text-[var(--orca-brand)]">
          {title}
        </h4>
        <p className="mt-1 text-sm text-[var(--orca-text-3)]">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[var(--orca-text-3)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--orca-brand)]" />
    </Link>
  );
}
