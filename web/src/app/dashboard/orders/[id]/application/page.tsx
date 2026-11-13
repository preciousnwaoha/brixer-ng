import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApplicationForm } from "@/components/orders/application-form";
import { getService } from "@/config/services";
import { env } from "@/lib/env";
import { authorizedOrder } from "@/lib/order-access";
import { notFound } from "next/navigation";
import type { ServiceDefinition } from "@/types";

export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ service?: string }> }) {
  const { id } = await params;
  const { service: slug = "business-name" } = await searchParams;
  let service = getService(slug)!;
  let readOnly = false;
  let initialAnswers: Record<string, string> = {};
  let documents: { id: string; file_name: string; field_id: string | null }[] = [];
  if (!env.demoMode) {
    const { order, supabase } = await authorizedOrder(id, "client");
    if (!order.service_snapshot) notFound();
    service = order.service_snapshot as ServiceDefinition;
    const [application, files] = await Promise.all([supabase.from("applications").select("answers,status").eq("order_id", id).maybeSingle(), supabase.from("documents").select("id,file_name,field_id").eq("order_id", id).eq("kind", "application")]);
    if (application.error || files.error) throw new Error("Unable to load your application.");
    readOnly = ["submitted", "approved"].includes(application.data?.status ?? "");
    initialAnswers = application.data?.answers ?? {}; documents = files.data ?? [];
  }
  if (!service) notFound();
  return <section className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-5 sm:p-8"><Link href={`/dashboard/orders/${id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft className="size-4" />Your order</Link><p className="text-xs font-bold text-secondary">{service.name}</p><h2 className="mt-3 text-2xl font-extrabold text-primary">{readOnly ? "Your submitted details" : "Enter Needed Details"}</h2><p className="mt-3 text-sm text-muted">Review your details before submitting so our team can begin filing.</p><div className="mt-8"><ApplicationForm service={service} orderId={id} initialAnswers={initialAnswers} documents={documents} readOnly={readOnly} /></div></section>;
}
