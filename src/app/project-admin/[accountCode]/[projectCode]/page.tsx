import Link from "next/link";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProjectAdminDashboardPage({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
}) {
  const { accountCode, projectCode } = await params;
  const base = `/project-admin/${accountCode}/${projectCode}`;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Projects" },
          { label: `${accountCode} - ${projectCode}` },
        ]}
      />

      <div>
        <div className="text-xl font-semibold text-slate-900">Dashboard</div>
        <div className="text-sm text-slate-500">Quick access to master data and configuration.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`${base}/master-data/users`}>
          <Card className="transition hover:border-slate-300">
            <CardContent className="p-5">
              <div className="text-sm font-semibold">Users</div>
              <div className="mt-1 text-xs text-slate-500">Master Data</div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`${base}/configuration/module-toggles`}>
          <Card className="transition hover:border-slate-300">
            <CardContent className="p-5">
              <div className="text-sm font-semibold">Module Toggles</div>
              <div className="mt-1 text-xs text-slate-500">Configuration</div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`${base}/audit-logs`}>
          <Card className="transition hover:border-slate-300">
            <CardContent className="p-5">
              <div className="text-sm font-semibold">Audit Logs</div>
              <div className="mt-1 text-xs text-slate-500">System</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}




