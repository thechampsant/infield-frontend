"use client";

import { Building2, CheckCircle, Download, Folder, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/pill";

type Project = {
  id: string;
  name: string;
  region: string;
  code: string;
  admin: string;
  adminEmail: string;
  modules: string[];
  status: "active" | "inactive" | "pending";
};

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Alpha Retail NYC",
    region: "North Region",
    code: "PRJ-NYC-01",
    admin: "Elena Gilbert",
    adminEmail: "e.gilbert@alpha.com",
    modules: ["Attendance", "Sales"],
    status: "active",
  },
  {
    id: "2",
    name: "Alpha Logistics Hub",
    region: "East Coast DC",
    code: "PRJ-LOG-04",
    admin: "Marcus Thorne",
    adminEmail: "m.thorne@alpha.com",
    modules: ["Attendance"],
    status: "active",
  },
  {
    id: "3",
    name: "Beta Store Setup",
    region: "Pending Launch",
    code: "PRJ-BETA-09",
    admin: "Sarah Jenkins",
    adminEmail: "s.jenkins@alpha.com",
    modules: [],
    status: "inactive",
  },
  {
    id: "4",
    name: "Alpha HQ Ops",
    region: "Internal Operations",
    code: "PRJ-HQ-00",
    admin: "David Chen",
    adminEmail: "d.chen@alpha.com",
    modules: ["All Modules"],
    status: "active",
  },
];

const columns: DataTableColumn<Project>[] = [
  {
    key: "name",
    header: "Project Name",
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--orca-brand-light)] text-[var(--orca-brand)]">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-[var(--orca-text)]">{row.name}</div>
          <div className="text-xs text-[var(--orca-text-3)]">{row.region}</div>
        </div>
      </div>
    ),
  },
  {
    key: "code",
    header: "Project Code",
    render: (row) => (
      <span className="font-mono text-sm text-[var(--orca-text-2)]">{row.code}</span>
    ),
  },
  {
    key: "admin",
    header: "Project Admin",
    render: (row) => (
      <div>
        <div className="font-medium text-[var(--orca-text)]">{row.admin}</div>
        <div className="text-xs text-[var(--orca-text-3)]">{row.adminEmail}</div>
      </div>
    ),
  },
  {
    key: "modules",
    header: "Modules Active",
    render: (row) =>
      row.modules.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.modules.map((mod) => (
            <Badge key={mod} variant="gray">
              {mod}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-[var(--orca-text-3)]">—</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill status={row.status} />,
  },
];

export default function AccountAdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Project Overview"
        description="Manage and monitor project status and access"
        actions={
          <Button variant="secondary">
            <Download className="h-4 w-4" />
            Export List
          </Button>
        }
      />

      {/* Stats Cards */}
      <StatCardGrid className="lg:grid-cols-3">
        <StatCard
          label="Total Projects"
          value="12"
          change={{ value: "+2", label: "this month", trend: "up" }}
          icon={Folder}
          iconColor="blue"
        />
        <StatCard
          label="Active Users"
          value="486"
          change={{ value: "Across all projects", label: "", trend: "neutral" }}
          icon={Users}
          iconColor="green"
        />
        <StatCard
          label="System Status"
          value="Healthy"
          change={{ value: "All systems operational", label: "", trend: "neutral" }}
          icon={CheckCircle}
          iconColor="green"
        />
      </StatCardGrid>

      {/* Projects Table */}
      <DataTable
        title="Projects"
        description="All projects under this account"
        searchPlaceholder="Search projects by name or code..."
        data={mockProjects}
        columns={columns}
        pagination={{
          page: 1,
          pageSize: 10,
          total: 12,
        }}
        onSearch={(q) => console.log("Search:", q)}
        onFilter={() => console.log("Filter clicked")}
      />
    </div>
  );
}
