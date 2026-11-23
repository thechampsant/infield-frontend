import type { ReactNode } from "react";
import { PublishNoticeProvider } from "@/components/project-admin/form-builder/workspace/publish-notice";

export default function FormBuilderLayout({ children }: { children: ReactNode }) {
  return <PublishNoticeProvider>{children}</PublishNoticeProvider>;
}
