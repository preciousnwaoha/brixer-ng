import Link from "next/link";
import { protectPage } from "@/lib/access";
import { OrderWorkspace } from "@/components/orders/order-workspace";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { await protectPage("admin"); return <main className="min-h-screen bg-alt-mint/50"><div className="shell max-w-5xl py-8"><Link href="/admin" className="mb-6 inline-block text-sm font-bold text-primary">← Dashboard</Link><OrderWorkspace orderId={(await params).id} admin={true} staff={false} /></div></main>; }
