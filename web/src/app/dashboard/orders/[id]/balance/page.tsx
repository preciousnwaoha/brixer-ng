import Link from "next/link";
import { ArrowLeft, CircleCheckBig } from "lucide-react";
import { notFound } from "next/navigation";
import { BalancePayment } from "@/components/billing/balance-payment";
import { env } from "@/lib/env";
import { authorizedOrder } from "@/lib/order-access";

interface OrderBalance { id: string; reference: string; service_code: string; total_kobo: number; paid_kobo: number }

export default async function BalancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order: OrderBalance | null = env.demoMode ? { id, reference: "BRX-0892", service_code: "LTD", total_kobo: 6_000_000, paid_kobo: 3_000_000 } : null;
  if (!env.demoMode) {
    const { supabase } = await authorizedOrder(id, "client");
    const result = await supabase.from("orders").select("id, reference, service_code, total_kobo, paid_kobo").eq("id", id).single();
    order = result.data as OrderBalance | null;
  }
  if (!order) notFound();

  return (
    <div>
      <Link href={`/dashboard/orders/${id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft className="size-4" />Your order</Link>
      <div className="grid place-items-center py-5">
        <section className="w-full max-w-xl rounded-[1.8rem] border border-line bg-white p-6 shadow-[0_30px_90px_rgba(27,67,50,.1)] sm:p-9">
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CircleCheckBig className="size-6" /></span>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-secondary">Complete your instalment</p>
          <h1 className="display-title mt-3 text-4xl font-bold text-primary">Settle your service balance.</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Once confirmed, this item’s completed documents can be downloaded when our team marks them ready.</p>
          <div className="mt-8"><BalancePayment orderId={order.id} reference={order.reference} totalKobo={order.total_kobo} paidKobo={order.paid_kobo} collectEmail={env.demoMode} /></div>
        </section>
      </div>
    </div>
  );
}
