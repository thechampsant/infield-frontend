"use client";

import Image from "next/image";
import { Download, Plus, Store, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/pill";

type User = {
  id: string;
  name: string;
  empCode: string;
  email: string;
  avatar?: string;
  designation: string;
  role: string;
  stores: string;
  storeCount?: number;
  status: "active" | "inactive" | "onboarding";
};

const mockUsers: User[] = [
  {
    id: "1",
    name: "Sarah Connor",
    empCode: "EMP-1024",
    email: "sarah.c@alpha.com",
    designation: "Regional Manager",
    role: "Manager Level 3",
    stores: "12 Stores",
    storeCount: 12,
    status: "active",
  },
  {
    id: "2",
    name: "Michael Chen",
    empCode: "EMP-1088",
    email: "m.chen@alpha.com",
    designation: "Store Manager",
    role: "Manager Level 1",
    stores: "Main Street Branch",
    status: "active",
  },
  {
    id: "3",
    name: "Jessica Pearson",
    empCode: "EMP-0092",
    email: "j.pearson@alpha.com",
    designation: "Sales Associate",
    role: "Employee",
    stores: "Downtown Hub",
    status: "inactive",
  },
  {
    id: "4",
    name: "David Rose",
    empCode: "EMP-1120",
    email: "david.r@alpha.com",
    designation: "Intern",
    role: "Employee",
    stores: "No Assignment",
    status: "onboarding",
  },
];

const columns: DataTableColumn<User>[] = [
  {
    key: "name",
    header: "User Details",
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[var(--orca-surface-2)]">
          {row.avatar ? (
            <Image src={row.avatar} alt={row.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--orca-brand)] to-[var(--orca-brand-2)] text-sm font-semibold text-white">
              {row.name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <div className="font-medium text-[var(--orca-text)]">{row.name}</div>
          <div className="text-xs text-[var(--orca-text-3)]">
            {row.empCode} • {row.email}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "designation",
    header: "Designation",
    render: (row) => (
      <span className="text-[var(--orca-text)]">{row.designation}</span>
    ),
  },
  {
    key: "role",
    header: "System Role",
    render: (row) => (
      <Badge variant={row.role.includes("Manager") ? "blue" : "gray"}>
        {row.role}
      </Badge>
    ),
  },
  {
    key: "stores",
    header: "Assigned Stores",
    render: (row) => (
      <div className="flex items-center gap-1.5 text-[var(--orca-text-2)]">
        {row.storeCount ? (
          <>
            <Store className="h-4 w-4 text-[var(--orca-text-3)]" />
            <span>{row.stores}</span>
          </>
        ) : (
          <span className="text-[var(--orca-text-3)]">{row.stores}</span>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill status={row.status} />,
  },
];

export default function UsersMasterPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="User Master"
        actions={
          <>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
            <Button variant="secondary">
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </>
        }
      />

      {/* Users Table */}
      <DataTable
        searchPlaceholder="Search users by name, email or code..."
        data={mockUsers}
        columns={columns}
        pagination={{
          page: 1,
          pageSize: 10,
          total: 1248,
        }}
        onSearch={(q) => console.log("Search:", q)}
        onFilter={() => console.log("Filter clicked")}
      />
    </div>
  );
}
