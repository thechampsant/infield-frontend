import { redirect } from "next/navigation";

// Projects are now managed from the unified Accounts screen (INF2-1529):
// each account row expands to show its projects, with add/go-to actions.
export default function SuperAdminProjectsPage() {
  redirect("/super-admin/accounts");
}
