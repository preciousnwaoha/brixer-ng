import { Quote, Star } from "lucide-react";
import { reviews } from "@/config/site";
import { SectionHeading } from "@/components/ui/section-heading";

export function ReviewsSection() {
  return (
    <section id="reviews" className="py-16 sm:py-16">
      <div className="shell">
        <SectionHeading
          eyebrow="Client stories"
          title="Real results from real business owners."
          align="center"
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={review.name}
              className="relative flex min-h-[300px] flex-col rounded-[1.6rem] border border-alt-sage/25 bg-alt-mint p-7"
            >
              <Quote className="size-9 text-alt-sage" fill="currentColor" />
              <div
                className="mt-3 flex gap-0.5 text-amber-500"
                aria-label="5 out of 5 stars"
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="size-3.5" fill="currentColor" />
                ))}
              </div>
              <blockquote className="mt-5 flex-1 text-[15px] leading-7 text-ink">
                “{review.quote}”
              </blockquote>
              <footer className="mt-6 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-primary text-xs font-extrabold text-white">
                  {review.initials}
                </span>
                <div>
                  <p className="text-sm font-extrabold text-primary">
                    {review.name}
                  </p>
                  <p className="text-xs text-muted">{review.role}</p>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
