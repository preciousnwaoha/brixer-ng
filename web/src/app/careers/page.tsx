import { InfoPage, ContentSection } from "@/components/content/info-page";
import { Button } from "@/components/ui/button";

export default function CareersPage() {
  return <InfoPage eyebrow="Careers" title="Help Nigerian businesses move with confidence." intro="We are building a more accountable, more human way to handle compliance."><ContentSection title="Work that makes complexity feel simple"><p>Brixer combines thoughtful software with experienced operations. We value clarity, ownership, respectful communication, and careful execution.</p></ContentSection><div className="rounded-2xl border border-line bg-alt-mint p-7"><h2 className="text-xl font-extrabold text-primary">No open roles right now</h2><p className="mt-2 text-sm leading-6 text-muted">We still welcome exceptional introductions. Send a short note with the kind of work you do best.</p><Button href="mailto:hello@brixer.ng" variant="outline" className="mt-5">Introduce yourself</Button></div></InfoPage>;
}
