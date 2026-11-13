export const dynamic = "force-dynamic";
import { PublicShell } from "@/components/layout/public-shell";
import { Ticker } from "@/components/home/ticker";
import { Hero } from "@/components/home/hero";
import { TrustStrip } from "@/components/home/trust-strip";
import { ServicesSection } from "@/components/home/services-section";
import { ProcessSection } from "@/components/home/process-section";
import { BankingSection } from "@/components/home/banking-section";
import { ReferralSection } from "@/components/home/referral-section";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { VideoReviews } from "@/components/reviews/video-reviews";
import { FaqSection } from "@/components/home/faq-section";
import { FinalCta } from "@/components/home/final-cta";

export default function HomePage() {
  return (
    <PublicShell>
      <Ticker />
      <Hero />
      <TrustStrip />
      <ServicesSection />
      <ProcessSection />
      <BankingSection />
      <ReferralSection />
      <ReviewsSection />
      <VideoReviews />
      <FaqSection />
      <FinalCta />
    </PublicShell>
  );
}
