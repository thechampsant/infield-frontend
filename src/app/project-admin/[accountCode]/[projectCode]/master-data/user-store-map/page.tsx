import { redirect } from "next/navigation";

export default async function RedirectMasterDataUserStoreMap({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
}) {
  const { accountCode, projectCode } = await params;
  redirect(`/project-admin/${accountCode}/${projectCode}/uploaders/user-store-map`);
}
