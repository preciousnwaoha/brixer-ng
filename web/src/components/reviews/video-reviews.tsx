import { PlayCircle } from "lucide-react";
import { siteConfig, videoReviews } from "@/config/site";
import { SectionHeading } from "@/components/ui/section-heading";

export function VideoReviews() {
  if (!siteConfig.features.videoReviews || videoReviews.length === 0) return null;
  return (
    <section className="bg-alt-cream py-20 sm:py-28">
      <div className="shell"><SectionHeading eyebrow="Watch their stories" title="Built for business owners who value clarity." align="center" /><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{videoReviews.map((video) => <article key={video.videoId} className="overflow-hidden rounded-[1.6rem] bg-white shadow-lg"><div className="aspect-video bg-primary grid place-items-center"><PlayCircle className="size-12 text-white" /></div><div className="p-5"><h3 className="font-extrabold text-primary">{video.title}</h3><p className="mt-1 text-sm text-muted">{video.customer}</p></div></article>)}</div></div>
    </section>
  );
}
