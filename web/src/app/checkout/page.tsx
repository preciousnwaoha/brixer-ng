import { checkoutCustomer } from "@/lib/checkout-customer";
import { CheckoutForm } from "@/components/billing/checkout-form";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function CheckoutPage() { const { contact, buyerId } = await checkoutCustomer(); return <main className="min-h-screen bg-alt-mint/60"><header className="border-b border-line bg-white"><div className="shell flex h-20 items-center justify-between"><Logo /><Link href="/cart" className="text-sm font-bold text-primary">← Review cart</Link></div></header><section className="shell max-w-3xl py-10 sm:py-16"><div className="rounded-[1.8rem] border border-line bg-white p-6 sm:p-9"><h1 className="display-title text-4xl font-bold text-primary">Start your services.</h1><p className="mb-8 mt-3 text-sm leading-6 text-muted">Our team will call you, and you can complete each service’s details in your dashboard.</p><CheckoutForm customer={contact} buyerId={buyerId} /></div></section></main>; }
