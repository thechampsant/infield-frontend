import { redirect } from "next/navigation";

export default async function RedirectMasterDataUsers({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
}) {
  const { accountCode, projectCode } = await params;
  redirect(`/project-admin/${accountCode}/${projectCode}/uploaders/users`);
}
