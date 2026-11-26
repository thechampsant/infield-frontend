"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { Megaphone, MessagesSquare, SlidersHorizontal } from "lucide-react";
import { useConnectBadge } from "@/hooks/use-connect-socket";
import { useOptionalProjectContext } from "@/lib/project-admin/project-context";
import { useConnectPermission } from "@/hooks/use-connect-permission";

export default function ConnectLayout({
  params,
  children,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
  children: React.ReactNode;
}) {
  const { accountCode, projectCode } = use(params);
  const base = `/project-admin/${accountCode}/${projectCode}/connect`;
  const pathname = usePathname();
  const router = useRouter();
  const projectContext = useOptionalProjectContext();
  const projectId = projectContext?.projectId;
  const { isAdmin, isLoading: isAuthLoading } = useConnectPermission();
  const { connectCount, wallUnseenCount, roomUnreadCount, clearWallUnseen, clearRoomUnread } = useConnectBadge(projectId);

  // Non-admins can access Wall and Chat rooms. Redirect only from Settings.
  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      if (pathname === `${base}/setting` || pathname.startsWith(`${base}/setting`)) {
        router.replace(`${base}/room`);
      }
    }
  }, [isAuthLoading, isAdmin, pathname, base, router]);

  // Clear wall unseen indicator when viewing Wall feed
  useEffect(() => {
    if (pathname === `${base}/wall` && wallUnseenCount > 0) {
      clearWallUnseen();
    }
  }, [pathname, base, wallUnseenCount, clearWallUnseen]);

  // Clear room unread indicator when viewing a specific chat room
  useEffect(() => {
    if (pathname.startsWith(`${base}/room/`) && roomUnreadCount > 0) {
      const pathParts = pathname.split("/");
      const openedRoomId = pathParts[pathParts.length - 1];
      if (openedRoomId && openedRoomId !== "room") {
        clearRoomUnread(openedRoomId);
      }
    }
  }, [pathname, base, roomUnreadCount, clearRoomUnread]);

  const allTabs = [
    {
      href: `${base}/wall`,
      label: "Wall",
      icon: Megaphone,
      badge: wallUnseenCount > 0 ? wallUnseenCount : null,
      adminOnly: false,
    },
    {
      href: `${base}/room`,
      label: "Chat rooms",
      icon: MessagesSquare,
      badge: roomUnreadCount > 0 ? roomUnreadCount : null,
      adminOnly: false,
    },
    { href: `${base}/setting`, label: "Settings", icon: SlidersHorizontal, adminOnly: true },
  ];

  const visibleTabs = isAdmin ? allTabs : allTabs.filter((t) => !t.adminOnly);

  return (
    <section className="w-full pb-12 font-sans text-slate-800">
      <header className="mb-4">
        <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">MODULES › CONNECT</div>
        <div className="flex items-center gap-3">
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Connect</h1>
          {connectCount > 0 && (
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {connectCount > 99 ? "99+" : connectCount} unseen
            </span>
          )}
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500">Wall and chat rooms for this project</p>
      </header>
      <nav aria-label="Connect sections" className="mb-6 flex items-center gap-2 border-b border-slate-200">
        {visibleTabs.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href === `${base}/room` && pathname.startsWith(`${base}/room`));
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`connect-tab-item ${active ? "connect-tab-item--active" : ""}`}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {badge !== null && badge !== undefined && badge > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold leading-none text-white bg-blue-600 rounded-full min-w-[16px] h-4">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {children}
    </section>
  );
}
