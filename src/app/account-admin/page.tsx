"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountAdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account-admin/projects");
  }, [router]);

  return null;
}
