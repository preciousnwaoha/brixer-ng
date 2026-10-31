import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="noise overflow-hidden bg-secondary py-20 text-white sm:py-24">
      <div className="shell relative text-center"><ShieldCheck className="mx-auto size-8 text-white/70" /><h2 className="display-title mx-auto mt-5 max-w-4xl text-balance text-4xl font-bold leading-tight sm:text-6xl">Your business deserves to be properly registered.</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">Choose the service you need, pay securely, and follow every update from one calm dashboard.</p><Button href="/services" variant="light" className="mt-8 px-7 text-secondary">Register my business <ArrowRight className="size-4" /></Button></div>
    </section>
  );
}
