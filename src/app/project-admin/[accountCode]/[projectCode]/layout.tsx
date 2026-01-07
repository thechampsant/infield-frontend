import { ConsoleShell } from "@/components/shell/console-shell";
import { projectAdminNav } from "@/lib/nav/nav";

export default async function ProjectAdminLayout({
  params,
  children,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
  children: React.ReactNode;
}) {
  const { accountCode, projectCode } = await params;
  const sections = projectAdminNav(accountCode, projectCode);

  return (
    <ConsoleShell
      brandTitle="Project Admin"
      brandSubtitle="Alpha Corp - Retail"
      sections={sections}
      breadcrumbs={[
        { label: "Projects", href: "/account-admin" },
        { label: "Alpha Corp - Retail", href: `/project-admin/${accountCode}/${projectCode}` },
        { label: "Master Data" },
      ]}
      user={{
        name: "Alexander M.",
        role: "Project Admin",
      }}
    >
      {children}
    </ConsoleShell>
  );
}
