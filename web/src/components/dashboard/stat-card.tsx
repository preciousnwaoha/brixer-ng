import type { ReactNode } from "react";

export function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon?: ReactNode }) {
  return <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_8px_25px_rgba(27,67,50,.035)]"><div className="flex items-start justify-between"><p className="text-xs font-bold text-muted">{label}</p>{icon}</div><p className="mt-3 text-3xl font-black tracking-tight text-primary">{value}</p><p className="mt-1 text-xs font-bold text-emerald-600">{detail}</p></div>;
}
