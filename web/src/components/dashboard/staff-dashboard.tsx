"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Banknote, BriefcaseBusiness, CheckCircle2, ClipboardList, Clock3, Home, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressTracker } from "@/components/orders/progress-tracker";
import { availableJobs } from "@/lib/demo-data";
import { formatNaira } from "@/lib/utils";
import { DashboardShell, type DashboardNavItem } from "./dashboard-shell";
import { StatCard } from "./stat-card";

const nav: DashboardNavItem[] = [
  { label: "My dashboard", href: "/staff", icon: Home },
  { label: "Available jobs", href: "#available", icon: ClipboardList },
  { label: "My active jobs", href: "#active", icon: Zap },
  { label: "Completed", href: "#completed", icon: CheckCircle2 },
  { label: "Earnings", href: "#", icon: Banknote, section: true },
  { label: "My earnings", href: "#earnings", icon: Banknote },
  { label: "Account", href: "#", icon: Settings, section: true },
  { label: "Settings", href: "#settings", icon: Settings }
];

async function getJobs() { const response = await fetch("/api/dashboard/staff"); return response.ok ? response.json() : { jobs: availableJobs }; }

export function StaffDashboard() {
  const queryClient = useQueryClient();
  const { data = { jobs: availableJobs } } = useQuery({ queryKey: ["dashboard", "staff"], queryFn: getJobs });
  const pickup = useMutation({
    mutationFn: async (jobId: string) => { const response = await fetch("/api/staff/jobs/pickup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) }); if (!response.ok) throw new Error("Job is no longer available."); return jobId; },
    onSuccess: (jobId) => queryClient.setQueryData(["dashboard", "staff"], (current: { jobs: typeof availableJobs } | undefined) => ({ jobs: current?.jobs.filter((job) => job.id !== jobId) ?? [] }))
  });
  const stage = useMutation({ mutationFn: async () => { const response = await fetch("/api/staff/orders/stage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderReference: "BRX-0897", stage: "processing" }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Unable to update stage"); return result; } });
  const flag = useMutation({ mutationFn: async () => { const response = await fetch("/api/staff/orders/flag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderReference: "BRX-0897", reason: "Requires administrator review" }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Unable to flag delay"); return result; } });
  return (
    <DashboardShell title="Staff dashboard — Tolu" subtitle="Active shift · Abuja operations" userName="Tolu Fashola" userMeta="Staff · ID STF-012" initials="TF" nav={nav}>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Jobs completed" value="31" detail="This month" /><StatCard label="Active jobs" value="2" detail="In progress" /><StatCard label="Total earned" value="₦98k" detail="This month" /><StatCard label="Avg. turnaround" value="2.4h" detail="BN average time" /></section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.8fr]">
        <section id="available" className="rounded-2xl border border-line bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="font-extrabold text-primary">Available jobs</h2><span className="rounded-full bg-alt-mint px-3 py-1 text-[10px] font-extrabold text-primary">{data.jobs.length} ready</span></div><div className="mt-5 flex gap-2 overflow-x-auto"><span className="rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-white">All</span>{["CAC", "Tax", "IP"].map((item) => <span key={item} className="rounded-full border border-line px-4 py-2 text-xs font-extrabold text-muted">{item}</span>)}</div><div className="mt-5 grid gap-3">{data.jobs.map((job: typeof availableJobs[number]) => <article key={job.id} className="rounded-2xl border border-line p-5 transition hover:border-alt-sage"><div className="flex gap-3"><span className="grid size-10 place-items-center rounded-xl bg-alt-mint text-primary"><BriefcaseBusiness className="size-4" /></span><div className="min-w-0 flex-1"><h3 className="font-extrabold text-primary">{job.service}</h3><p className="mt-1 text-xs text-muted">Client: {job.client} · {job.id}</p></div><div className="text-right"><strong className="text-sm text-secondary">{formatNaira(job.earning)}</strong><p className="text-[10px] text-muted">Your cut</p></div></div><p className="mt-4 text-xs leading-5 text-muted">{job.detail}</p><div className="mt-4 flex items-center justify-between"><span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold text-blue-700">New · ready now</span><Button onClick={() => pickup.mutate(job.id)} disabled={pickup.isPending} variant="dark" className="min-h-9 px-4 py-2 text-xs">Pick up job</Button></div></article>)}{data.jobs.length === 0 && <div className="rounded-2xl bg-alt-mint p-8 text-center text-sm font-bold text-primary">You are all caught up.</div>}</div></section>
        <div className="grid content-start gap-6">
          <section id="active" className="rounded-2xl border border-line bg-white p-5 sm:p-7"><h2 className="font-extrabold text-primary">My active job</h2><div className="mt-5 rounded-2xl bg-alt-mint p-5"><p className="text-sm font-extrabold text-primary">BN Registration — Kemi Adeyemi</p><p className="mt-1 text-xs text-muted">BRX-0897 · Picked up 9:14am</p><div className="mt-5"><ProgressTracker stage={stage.isSuccess ? "processing" : "submitted"} /></div>{(stage.isSuccess || flag.isSuccess) && <p className="mt-4 rounded-lg bg-white/70 px-3 py-2 text-xs font-bold text-primary">{stage.isSuccess ? "Stage updated to processing." : "Delay flagged for administrator review."}</p>}{(stage.error || flag.error) && <p className="mt-4 text-xs font-bold text-red-700">{(stage.error ?? flag.error)?.message}</p>}<div className="mt-5 grid grid-cols-[1fr_auto] gap-2"><Button onClick={() => stage.mutate()} disabled={stage.isPending || stage.isSuccess} variant="dark" className="min-h-10">{stage.isSuccess ? "Processing" : "Mark as processing"}</Button><Button onClick={() => flag.mutate()} disabled={flag.isPending || flag.isSuccess} variant="outline" className="min-h-10 px-3">{flag.isSuccess ? "Flagged" : "Flag delay"}</Button></div></div></section>
          <section id="earnings" className="rounded-2xl bg-primary p-6 text-white"><div className="flex items-center justify-between"><p className="text-sm font-extrabold">This month's earnings</p><Banknote className="size-5 text-alt-sage" /></div><p className="mt-3 text-4xl font-black">₦98,000</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-white/55">Jobs completed</p><p className="mt-1 text-lg font-black">31</p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-white/55">Last payout</p><p className="mt-1 text-lg font-black">₦74k</p></div></div></section>
        </div>
      </div>
    </DashboardShell>
  );
}
