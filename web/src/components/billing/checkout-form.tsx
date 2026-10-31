"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, CreditCard, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ServiceDefinition } from "@/types";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

const schema = z.object({
  fullName: z.string().min(3, "Enter your full name"),
  email: z.email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone number"),
  referralCode: z.string().optional(),
  paymentPlan: z.enum(["full", "installment"]),
  whatsappConsent: z.boolean()
});
type Values = z.infer<typeof schema>;

export function CheckoutForm({ service }: { service: ServiceDefinition }) {
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { paymentPlan: "full", whatsappConsent: false } });
  const paymentPlan = watch("paymentPlan");
  const dueNow = paymentPlan === "installment" ? service.priceKobo / 2 : service.priceKobo;

  async function submit(values: Values) {
    setServerError("");
    try {
      const response = await fetch("/api/checkout/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, serviceCode: service.code }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to start payment");
      if (!result.authorizationUrl) throw new Error("Unable to open secure payment. Please try again.");
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to start payment");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="grid gap-6">
      <div className="grid gap-5 sm:grid-cols-2"><TextField label="Full name" autoComplete="name" placeholder="Chidi Johnson" error={errors.fullName?.message} {...register("fullName")} /><TextField label="Email address" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} /></div>
      <div className="grid gap-5 sm:grid-cols-2"><TextField label="Phone / WhatsApp number" autoComplete="tel" placeholder="+234 801 234 5678" error={errors.phone?.message} {...register("phone")} /><TextField label="Referral code (optional)" placeholder="BRX-ADA" {...register("referralCode")} /></div>
      <fieldset><legend className="text-sm font-extrabold text-primary">Choose how to pay</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setValue("paymentPlan", "full")} className={`rounded-2xl border p-5 text-left transition ${paymentPlan === "full" ? "border-primary bg-alt-mint ring-2 ring-primary/10" : "border-line bg-white"}`}><span className="flex items-center justify-between"><CreditCard className="size-5 text-primary" />{paymentPlan === "full" && <Check className="size-4 text-primary" />}</span><strong className="mt-4 block text-sm text-primary">Pay in full</strong><span className="mt-1 block text-xs leading-5 text-muted">Pay {formatNaira(service.priceKobo)} and start immediately.</span></button>
        <button type="button" disabled={!service.installmentEligible} onClick={() => setValue("paymentPlan", "installment")} className={`rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${paymentPlan === "installment" ? "border-secondary bg-alt-cream ring-2 ring-secondary/10" : "border-line bg-white"}`}><span className="flex items-center justify-between"><CreditCard className="size-5 text-secondary" />{paymentPlan === "installment" && <Check className="size-4 text-secondary" />}</span><strong className="mt-4 block text-sm text-primary">Pay 50% now</strong><span className="mt-1 block text-xs leading-5 text-muted">Pay {formatNaira(service.priceKobo / 2)} now, then the balance at filing.</span></button>
      </div></fieldset>
      <label className="flex items-start gap-3 rounded-2xl bg-[#f8faf9] p-4 text-xs leading-5 text-muted"><input type="checkbox" className="mt-1 size-4 accent-primary" {...register("whatsappConsent")} /><span>Send transactional order updates to this WhatsApp number when the channel is available. You can change this later.</span></label>
      {serverError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{serverError}</p>}
      <div className="rounded-2xl bg-primary p-5 text-white"><div className="flex items-center justify-between"><span className="text-sm text-white/70">Due now</span><strong className="text-2xl">{formatNaira(dueNow)}</strong></div><Button type="submit" disabled={isSubmitting} className="mt-5 w-full bg-white text-secondary hover:bg-alt-cream">{isSubmitting ? "Preparing payment…" : "Continue to secure payment"}<ArrowRight className="size-4" /></Button><p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-white/55"><LockKeyhole className="size-3" />Payment is completed securely with Paystack.</p></div>
    </form>
  );
}
