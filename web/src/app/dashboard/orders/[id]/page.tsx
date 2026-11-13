import Link from "next/link";
import { OrderWorkspace } from "@/components/orders/order-workspace";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { return <><Link href="/dashboard/orders" className="mb-6 inline-block text-sm font-bold text-primary">← Your orders</Link><OrderWorkspace orderId={(await params).id} /></>; }
