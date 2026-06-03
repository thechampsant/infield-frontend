"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MasterShell } from "@/components/shell/master-shell";
import type { ClientBrandDisplay } from "@/components/shell/master-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { managerNav } from "@/lib/nav/nav";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchClientBrand } from "@/lib/api/shell-service";
import { inboxService } from "@/lib/api/inbox-service";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [clientBrand, setClientBrand] = useState<ClientBrandDisplay | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [inbox, brand] = await Promise.allSettled([
        inboxService.getAssignedToMe({}),
        fetchClientBrand(),
      ]);
      if (cancelled) return;
      if (inbox.status === "fulfilled") {
        setNotificationCount(inbox.value.summary.total);
      }
      if (brand.status === "fulfilled" && brand.value?.logoUrl) {
        setClientBrand({
          logoUrl: brand.value.logoUrl,
          name: brand.value.name,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The inbox page broadcasts the live pending count after each approve/reject
  // so the sidebar badge stays in sync without a full refetch here.
  useEffect(() => {
    function onPendingChanged(e: Event) {
      const detail = (e as CustomEvent<{ count: number }>).detail;
      if (detail && typeof detail.count === "number") {
        setNotificationCount(detail.count);
      }
    }
    window.addEventListener("inbox:pending-changed", onPendingChanged);
    return () =>
      window.removeEventListener("inbox:pending-changed", onPendingChanged);
  }, []);

  const sections = useMemo(
    () => managerNav(notificationCount),
    [notificationCount],
  );

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Manager";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <ProtectedRoute>
      <MasterShell
        sections={sections}
        brandTag="V5 Global"
        homeHref="/workspace"
        notificationsHref="/workspace/notifications"
        profileHref="/workspace/profile"
        notificationCount={notificationCount}
        clientBrand={clientBrand}
        user={{
          name: displayName,
          role: user?.role ?? "Manager",
        }}
        onLogout={handleLogout}
      >
        {children}
      </MasterShell>
    </ProtectedRoute>
  );
}
