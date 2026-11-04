"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use } from "react";
import { Megaphone, MessagesSquare, SlidersHorizontal } from "lucide-react";

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
  const tabs = [
    { href: `${base}/wall`, label: "Wall", icon: Megaphone },
    { href: `${base}/room`, label: "Chat rooms", icon: MessagesSquare },
    { href: `${base}/setting`, label: "Settings", icon: SlidersHorizontal },
  ];

  return (
    <section className="w-full pb-12 font-sans text-slate-800">
      <header className="mb-4">
        <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">MODULES › CONNECT</div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Connect</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">Wall and chat rooms for this project</p>
      </header>
      <nav aria-label="Connect sections" className="mb-6 flex items-center gap-2 border-b border-slate-200">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`connect-tab-item ${active ? "connect-tab-item--active" : ""}`}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      {children}
    </section>
  );
}
