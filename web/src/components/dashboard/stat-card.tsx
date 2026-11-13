import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function StatCard({ label, value, detail, icon, href }: { label: string; value: string; detail: string; icon?: ReactNode; href?: string }) {
  return <div className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-[0_8px_25px_rgba(27,67,50,.035)] sm:p-3 lg:p-5"><div className="flex items-start justify-between gap-1"><p className="min-w-0 break-words text-xs font-bold text-muted">{label}</p>{href ? <Link href={href} aria-label={`View ${label.toLowerCase()}`} className="-m-1 grid size-7 shrink-0 sm:size-6 lg:size-8 place-items-center rounded-lg text-primary hover:bg-alt-mint"><ArrowUpRight className="size-4" /></Link> : icon}</div><p className="mt-3 break-words text-xl font-black tracking-tight text-primary sm:text-xl xl:text-3xl">{value}</p><p className="mt-1 text-xs font-bold text-emerald-600">{detail}</p></div>;
}
