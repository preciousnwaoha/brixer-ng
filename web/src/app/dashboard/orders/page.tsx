import { Suspense } from "react";
import { ClientOrders } from "@/components/dashboard/client-orders";
export default function OrdersPage() { return <Suspense fallback={<p>Loading orders…</p>}><ClientOrders /></Suspense>; }
