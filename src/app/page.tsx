import Link from "next/link";
import { ArrowRight, Building2, Folder, Shield } from "lucide-react";

const consoles = [
  {
    title: "Super Admin",
    description: "Platform-wide account and project management",
    href: "/super-admin",
    icon: Shield,
    color: "blue",
  },
  {
    title: "Account Admin",
    description: "Manage projects within your organization",
    href: "/account-admin",
    icon: Building2,
    color: "green",
  },
  {
    title: "Project Admin",
    description: "Configure users, stores, and modules",
    href: "/project-admin/ALPHA-001/PRJ-NYC-01/master-data/users",
    icon: Folder,
    color: "amber",
  },
];

const colorMap = {
  blue: {
    bg: "bg-[var(--orca-brand-light)]",
    text: "text-[var(--orca-brand)]",
    hover: "group-hover:bg-[var(--orca-brand)] group-hover:text-white",
  },
  green: {
    bg: "bg-[var(--orca-brand-2-light)]",
    text: "text-[var(--orca-brand-2)]",
    hover: "group-hover:bg-[var(--orca-brand-2)] group-hover:text-white",
  },
  amber: {
    bg: "bg-[var(--orca-brand-3-light)]",
    text: "text-[var(--orca-brand-3)]",
    hover: "group-hover:bg-[var(--orca-brand-3)] group-hover:text-white",
  },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 py-16">
      <div className="w-full max-w-3xl space-y-8">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--orca-brand)] text-white shadow-lg">
            <span className="text-2xl font-bold">I</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--orca-text)] sm:text-4xl">
            Infield
          </h1>
          <p className="mt-2 text-lg text-[var(--orca-text-3)]">
            Enterprise Platform for Admin Configuration
          </p>
        </div>

        {/* Console Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {consoles.map((console) => {
            const colors = colorMap[console.color as keyof typeof colorMap];
            return (
              <Link
                key={console.href}
                href={console.href}
                className="group flex flex-col rounded-xl border border-[var(--orca-border)] bg-[var(--orca-surface)] p-5 transition-all hover:border-[var(--orca-brand)] hover:shadow-lg"
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${colors.bg} ${colors.text} ${colors.hover}`}
                >
                  <console.icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-[var(--orca-text)]">
                  {console.title}
                </h2>
                <p className="mt-1 flex-1 text-sm text-[var(--orca-text-3)]">
                  {console.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--orca-brand)]">
                  Enter Console
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--orca-text-3)]">
          Infield v1.0 • Built with Next.js
        </p>
      </div>
    </main>
  );
}
