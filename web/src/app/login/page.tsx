import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/logo";

const points = ["Track every order stage", "Complete service applications", "Access documents securely", "Manage referral earnings"];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-alt-mint lg:grid-cols-[.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-primary p-14 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-20 -top-20 size-96 rounded-full border border-white/10" /><Logo inverse /><div className="relative max-w-lg"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-alt-sage">Your business command centre</p><h1 className="display-title mt-5 text-6xl font-bold leading-[1.02]">Everything important, in one calm view.</h1><ul className="mt-9 grid gap-4">{points.map((point) => <li key={point} className="flex items-center gap-3 text-sm font-semibold text-white/75"><CheckCircle2 className="size-5 text-alt-sage" />{point}</li>)}</ul></div><p className="text-xs text-white/40">Brixer · Business compliance, beautifully handled.</p></section>
      <section className="grid place-items-center p-5 py-10"><div className="w-full max-w-md rounded-[1.8rem] border border-line bg-white p-7 shadow-[0_30px_90px_rgba(27,67,50,.1)] sm:p-10"><div className="mb-8 lg:hidden"><Logo /></div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-secondary">Dashboard access</p><h2 className="display-title mt-3 text-4xl font-bold text-primary">Welcome to Brixer.</h2><p className="mt-3 text-sm leading-6 text-muted">Log in to claim an order, finish an application, or follow your progress.</p><div className="mt-8"><Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-alt-mint" />}><LoginForm /></Suspense></div></div></section>
    </main>
  );
}
