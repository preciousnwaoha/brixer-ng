"use client";
import { useState } from "react";
import { useClientDashboard } from "./client-layout";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
export function ClientReferral() {
  const data = useClientDashboard(); const [copied, setCopied] = useState(false);
  if (!data) return null;
  return <section className="max-w-2xl rounded-2xl border border-line bg-white p-6"><h2 className="text-xl font-bold text-primary">Referral</h2><p className="mt-3 text-sm text-muted">Share your code with someone placing an order. Eligible rewards appear in your referral wallet.</p><p className="mt-6 text-xs font-bold text-muted">Available referral balance</p><p className="mt-2 text-3xl font-black text-primary">{formatNaira(data.referralBalanceKobo ?? 0)}</p>{data.referralCode && <div className="mt-6 rounded-xl bg-alt-mint p-4"><p className="text-xs text-muted">Your referral code</p><p className="mt-2 break-all text-xl font-bold text-primary">{data.referralCode}</p><Button className="mt-4" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(data.referralCode!); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Copied" : "Copy code"}</Button></div>}<Button href="/referrals" variant="outline" className="mt-6">How referrals work</Button></section>;
}
