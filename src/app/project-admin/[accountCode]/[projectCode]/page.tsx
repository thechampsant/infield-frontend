import { redirect } from "next/navigation";
import { projectAdminUploadersEntryPath } from "@/lib/project-admin/setup-paths";

export default async function ProjectAdminRootPage({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
}) {
  const { accountCode, projectCode } = await params;
  redirect(projectAdminUploadersEntryPath(accountCode, projectCode));
}
