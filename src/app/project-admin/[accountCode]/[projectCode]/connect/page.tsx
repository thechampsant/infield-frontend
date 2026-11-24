"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useConnectPermission } from "@/hooks/use-connect-permission";

export default function ConnectIndex() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading } = useConnectPermission();

  useEffect(() => {
    if (isLoading) return;
    const cleanPath = pathname?.replace(/\/$/, "") || "";
    router.replace(`${cleanPath}/wall`);
  }, [isLoading, pathname, router]);

  return null;
}
