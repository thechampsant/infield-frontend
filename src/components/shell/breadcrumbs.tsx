import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      {items.map((c, idx) => (
        <div key={`${c.label}-${idx}`} className="flex items-center gap-2">
          {idx > 0 ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : null}
          {c.href ? (
            <Link href={c.href} className="hover:text-slate-700">
              {c.label}
            </Link>
          ) : (
            <span className="text-slate-700">{c.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}


