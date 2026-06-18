"use client";

import { use } from "react";
import { FormBuilderWorkspace } from "@/components/project-admin/form-builder/workspace/form-builder-workspace";

export default function FormBuilderWorkspacePage({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string; configId: string }>;
}) {
  const { configId } = use(params);

  return <FormBuilderWorkspace configId={configId} />;
}
