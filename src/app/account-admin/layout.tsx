import { ConsoleShell } from "@/components/shell/console-shell";
import { accountAdminNav } from "@/lib/nav/nav";

export default function AccountAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsoleShell
      brandTitle="Account Admin"
      brandSubtitle="Alpha Corp Retail"
      sections={accountAdminNav}
      breadcrumbs={[
        { label: "Alpha Corp Retail", href: "/account-admin" },
        { label: "Projects Dashboard" },
      ]}
      user={{
        name: "David Chen",
        role: "Account Admin",
      }}
    >
      {children}
    </ConsoleShell>
  );
}
