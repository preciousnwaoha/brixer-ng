import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApplicationForm } from "@/components/orders/application-form";
import { Logo } from "@/components/ui/logo";
import { getService } from "@/config/services";

export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ service?: string }> }) {
  const { id } = await params;
  const { service: slug = "business-name" } = await searchParams;
  const service = getService(slug) ?? getService("business-name")!;
  return <main className="min-h-screen bg-alt-mint/50"><header className="border-b border-line bg-white"><div className="shell flex h-20 items-center justify-between"><Logo /><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft className="size-4" />Dashboard</Link></div></header><div className="shell max-w-3xl py-10 sm:py-16"><div className="rounded-[1.8rem] border border-line bg-white p-6 shadow-sm sm:p-9"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-secondary">{service.categoryLabel} application</p><h1 className="display-title mt-3 text-4xl font-bold text-primary">Tell us what we need to begin.</h1><p className="mt-3 text-sm leading-6 text-muted">Your progress is saved securely. Review the requirements before submitting.</p><div className="mt-9"><ApplicationForm service={service} orderId={id} /></div></div></div></main>;
}
