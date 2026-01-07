import { ConsoleShell } from "@/components/shell/console-shell";
import { superAdminNav } from "@/lib/nav/nav";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsoleShell
      brandTitle="Super Admin"
      brandSubtitle="Super Admin Console"
      sections={superAdminNav}
      breadcrumbs={[{ label: "Dashboard" }]}
      projectSelector={{ label: "Project: Retail Operations" }}
      user={{
        name: "John Anderson",
        role: "Super Admin",
      }}
    >
      {children}
    </ConsoleShell>
  );
}
