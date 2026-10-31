import { Suspense } from "react";
import { ClaimCard } from "@/components/auth/claim-card";
import { Logo } from "@/components/ui/logo";

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ order?: string; token?: string }> }) {
  const { order = "demo-order", token = "demo-token" } = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-alt-mint p-5"><section className="w-full max-w-lg rounded-[1.8rem] border border-line bg-white p-7 shadow-xl sm:p-10"><Logo /><div className="mt-9"><Suspense><ClaimCard order={order} token={token} /></Suspense></div></section></main>;
}
