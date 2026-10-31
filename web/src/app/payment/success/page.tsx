import Link from "next/link";
import { CheckCircle2, Clock3, CircleAlert, MailCheck, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { confirmPayment, type PaymentConfirmation } from "@/lib/payment-confirmation";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const query = await searchParams;
  const reference = query.reference ?? query.trxref ?? "";
  let confirmation: PaymentConfirmation = { state: reference ? "pending" : "failed", orderReference: reference, isBalance: false, claimAvailable: false };
  if (reference) {
    try { confirmation = await confirmPayment(reference); } catch { /* Keep the page pending until verification succeeds. */ }
  }
  const verified = confirmation.state === "confirmed";
  const failed = confirmation.state === "failed";
  const Icon = verified ? CheckCircle2 : failed ? CircleAlert : Clock3;
  const title = verified ? (confirmation.isBalance ? "Your balance is paid." : "Your order is in.") : failed ? "Payment not confirmed." : "We’re confirming your payment.";
  const note = verified
    ? confirmation.isBalance ? "Your balance payment has been confirmed. Continue to your dashboard to follow the next stage."
      : confirmation.claimAvailable ? "Your payment has been recorded. Check your inbox for a secure link to claim the order, complete your application, and follow every update."
      : "Your payment has been confirmed. Continue to your Brixer dashboard to follow the next steps."
    : failed ? "We could not confirm a successful payment for this order. Return to checkout to try again, or contact support if you have already paid."
    : "Paystack has not confirmed this payment yet. Check the status again in a moment before making another payment.";
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_0%,rgba(82,183,136,.18),transparent_35%),#f0f7f4] p-5">
      <section className="w-full max-w-xl rounded-[2rem] border border-line bg-white p-7 text-center shadow-[0_35px_100px_rgba(27,67,50,.15)] sm:p-11">
        <Logo />
        <span className={`mx-auto mt-9 grid size-16 place-items-center rounded-full ${verified ? "bg-emerald-50 text-emerald-600" : failed ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}><Icon className="size-8" /></span>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-secondary">{verified ? "Payment confirmed" : failed ? "Payment not confirmed" : "Confirmation pending"}</p>
        <h1 className="display-title mt-3 text-4xl font-bold text-primary">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-muted">{note}</p>
        {reference && <div className="mt-6 rounded-2xl bg-alt-mint p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Order reference</p><p className="mt-1 break-all text-lg font-black tracking-wide text-primary">{confirmation.orderReference}</p></div>}
        {verified && confirmation.claimAvailable && <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-primary"><MailCheck className="size-4 text-alt-sage" />The claim link remains valid for seven days.</div>}
        {verified ? <Button href="/login" className="mt-8 w-full">Continue to dashboard <MoveRight className="size-4" /></Button> : reference && !failed ? <a href={`/payment/success?reference=${encodeURIComponent(reference)}`} className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white">Check payment status</a> : <Button href="/services" className="mt-8 w-full">Browse services</Button>}
        <Link href="/" className="mt-4 inline-block text-xs font-bold text-muted hover:text-primary">Return to homepage</Link>
      </section>
    </main>
  );
}
