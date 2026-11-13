"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Home, Package } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";
import { StatCard } from "./stat-card";
import { Button } from "@/components/ui/button";
import { postAction } from "@/components/orders/order-actions";
import { formatNaira } from "@/lib/utils";
import type { DashboardData } from "@/types/operations";
const nav = [{ label: "My dashboard", href: "/staff", icon: Home }, { label: "Jobs", href: "#jobs", icon: Package }];
export function StaffDashboard() {
  const query = useQueryClient(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const { data, error, isPending } = useQuery<DashboardData & { userId: string }>({ queryKey: ["dashboard", "staff"], refetchInterval: 30000, queryFn: async () => { const response = await fetch("/api/dashboard/staff"); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; } });
  const name = data?.profile.full_name ?? "Staff dashboard"; const orders = data?.orders ?? [];
  return <DashboardShell title="Staff dashboard" subtitle="Available and assigned service items." userName={name} userMeta={data?.profile.staff_code ?? "Staff account"} initials={name.slice(0, 2).toUpperCase()} nav={nav}>
    {isPending && <p role="status">Loading jobs…</p>}{error && <p role="alert" className="text-red-700">{error.message}</p>}{message && <p role="status" className="mb-4 rounded-xl bg-alt-mint p-4">{message}</p>}{data && <><section className="grid gap-4 sm:grid-cols-3"><StatCard label="Available jobs" value={String(orders.filter((o) => !o.assigned_staff_id).length)} detail="Paid service items" /><StatCard label="Assigned jobs" value={String(orders.filter((o) => o.assigned_staff_id === data.userId && o.stage !== "completed").length)} detail="Currently in progress" /><StatCard label="Available earnings" value={formatNaira(data.earningsKobo ?? 0)} detail="Recorded completed jobs" /></section><section id="jobs" className="mt-8 grid gap-4 lg:grid-cols-2">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-line bg-white p-5"><h2 className="font-bold text-primary">{order.service_snapshot?.name ?? order.service_code}</h2><p className="mt-2 text-sm text-muted">{order.customer_name} · {order.reference} · {order.stage}</p>{order.assigned_staff_id ? <Button href={`/staff/orders/${order.id}`} className="mt-4">Open service item</Button> : <Button disabled={busy} className="mt-4" onClick={async () => { setBusy(true); try { await postAction("/api/staff/jobs/pickup", { jobId: order.reference }); await query.invalidateQueries({ queryKey: ["dashboard", "staff"] }); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }}>Pick up job</Button>}</article>)}{!orders.length && <p>No available jobs right now.</p>}</section></>}
  </DashboardShell>;
}
