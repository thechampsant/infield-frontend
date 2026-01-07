"use client";

import { Building2, Download, Folder, Plus, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/pill";

type Account = {
  id: string;
  name: string;
  type: string;
  code: string;
  projects: number;
  users: number;
  status: "active" | "inactive" | "pending";
  createdAt: string;
};

const mockAccounts: Account[] = [
  {
    id: "1",
    name: "Retail Solutions Inc.",
    type: "Primary Account",
    code: "ACC-2024-001",
    projects: 12,
    users: 284,
    status: "active",
    createdAt: "Jan 15, 2024",
  },
  {
    id: "2",
    name: "Manufacturing Corp",
    type: "Enterprise Account",
    code: "ACC-2024-002",
    projects: 8,
    users: 156,
    status: "active",
    createdAt: "Jan 20, 2024",
  },
  {
    id: "3",
    name: "Logistics Partners Ltd",
    type: "Standard Account",
    code: "ACC-2024-003",
    projects: 15,
    users: 412,
    status: "active",
    createdAt: "Feb 03, 2024",
  },
  {
    id: "4",
    name: "Tech Services Group",
    type: "Premium Account",
    code: "ACC-2024-004",
    projects: 6,
    users: 98,
    status: "pending",
    createdAt: "Feb 10, 2024",
  },
  {
    id: "5",
    name: "Healthcare Systems",
    type: "Enterprise Account",
    code: "ACC-2024-005",
    projects: 20,
    users: 628,
    status: "active",
    createdAt: "Feb 15, 2024",
  },
];

const columns: DataTableColumn<Account>[] = [
  {
    key: "name",
    header: "Account Name",
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--orca-brand-4-light)] text-[var(--orca-brand-4)]">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-[var(--orca-text)]">{row.name}</div>
          <div className="text-xs text-[var(--orca-text-3)]">{row.type}</div>
        </div>
      </div>
    ),
  },
  {
    key: "code",
    header: "Account Code",
    render: (row) => (
      <span className="font-mono text-sm text-[var(--orca-text-2)]">{row.code}</span>
    ),
  },
  {
    key: "projects",
    header: "Projects",
    render: (row) => <Badge variant="blue">{row.projects} Projects</Badge>,
  },
  {
    key: "users",
    header: "Users",
    render: (row) => <span className="text-[var(--orca-text)]">{row.users}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill status={row.status} />,
  },
  {
    key: "createdAt",
    header: "Created Date",
    sortable: true,
    render: (row) => (
      <span className="text-[var(--orca-text-2)]">{row.createdAt}</span>
    ),
  },
];

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Account Management"
        description="Manage and configure all accounts across the platform"
        actions={
          <>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="secondary">
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              Create Account
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <StatCardGrid>
        <StatCard
          label="Total Accounts"
          value="24"
          change={{ value: "+12%", label: "from last month", trend: "up" }}
          icon={Building2}
          iconColor="blue"
        />
        <StatCard
          label="Active Projects"
          value="156"
          change={{ value: "+8%", label: "from last month", trend: "up" }}
          icon={Folder}
          iconColor="green"
        />
        <StatCard
          label="Total Users"
          value="2,847"
          change={{ value: "+24%", label: "from last month", trend: "up" }}
          icon={Users}
          iconColor="amber"
        />
        <StatCard
          label="Pending Approvals"
          value="18"
          change={{ value: "+3", label: "from yesterday", trend: "up" }}
          icon={Users}
          iconColor="red"
        />
      </StatCardGrid>

      {/* Accounts Table */}
      <DataTable
        title="Accounts List"
        description="View and manage all organizational accounts"
        searchPlaceholder="Search accounts..."
        data={mockAccounts}
        columns={columns}
        pagination={{
          page: 1,
          pageSize: 10,
          total: 24,
        }}
        onSearch={(q) => console.log("Search:", q)}
        onFilter={() => console.log("Filter clicked")}
      />
    </div>
  );
}
