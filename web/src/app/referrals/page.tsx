import { PublicShell } from "@/components/layout/public-shell";
import { ReferralSection } from "@/components/home/referral-section";
import { SectionHeading } from "@/components/ui/section-heading";

export default function ReferralsPage() {
  return (
    <PublicShell>
      <section className="noise border-b border-line bg-alt-mint py-16 sm:py-24"><div className="shell"><SectionHeading eyebrow="Brixer referrals" title="Your trusted recommendation can earn real money." copy="Share your personal Brixer link. Eligible rewards are tracked automatically when a referred customer pays." /></div></section>
      <ReferralSection />
    </PublicShell>
  );
}
