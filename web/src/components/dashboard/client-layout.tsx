"use client";
import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Home, Package, FileText, WalletCards, Plus, ShoppingCart } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import type { DashboardData } from "@/types/operations";
const nav = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Your orders", href: "/dashboard/orders", icon: Package },
  { label: "Your Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Referral", href: "/dashboard/referral", icon: WalletCards }
];
const ClientData = createContext<DashboardData | undefined>(undefined);
export function useClientDashboard() { return useContext(ClientData); }
export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const cart = useCart();
  const { data, error, isPending, refetch } = useQuery<DashboardData>({ queryKey: ["dashboard", "client"], refetchInterval: 30000, queryFn: async () => { const response = await fetch("/api/dashboard/client"); const result = await response.json(); if (!response.ok) throw new Error(result.error); return result; } });
  const name = data?.profile.full_name || "Your account";
  const title = pathname === "/dashboard" ? `Welcome, ${name}` : pathname === "/dashboard/new-order" ? "New order" : nav.find((item) => item.href !== "/dashboard" && pathname.startsWith(item.href))?.label ?? "Your order";
  const count = cart.items.reduce((total, item) => total + item.quantity, 0);
  return <ClientData.Provider value={data}><DashboardShell title={title} subtitle="Your services, information requests, and documents." userName={name} userMeta="Client account" initials={name.slice(0, 2).toUpperCase()} nav={nav} notificationHref="/dashboard#notifications" sidebarAction={<Button href="/dashboard/new-order" className="w-full bg-white text-primary hover:bg-alt-mint"><Plus className="size-4" />New order</Button>} action={count > 0 ? <Link href="/cart" aria-label={`Cart, ${count} items`} className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-line text-primary"><ShoppingCart className="size-5" /><span className="absolute -right-2 -top-2 rounded-full bg-secondary px-1.5 text-[10px] font-bold text-white">{count}</span></Link> : undefined}>
    {isPending && <p role="status" className="mb-6">Loading your dashboard…</p>}
    {error && <div role="alert" className="mb-6 rounded-xl bg-red-50 p-5 text-red-700">{error.message}<button onClick={() => void refetch()} className="ml-3 underline">Retry</button></div>}
    <div className={count > 0 ? "pb-20" : undefined}>{children}</div>
  </DashboardShell></ClientData.Provider>;
}
