import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, copy, align = "left", inverse = false }: { eyebrow: string; title: string; copy?: string; align?: "left" | "center"; inverse?: boolean }) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className={cn("mb-4 text-xs font-extrabold uppercase tracking-[.22em]", inverse ? "text-alt-sage" : "text-secondary")}>{eyebrow}</p>
      <h2 className={cn("display-title text-balance text-4xl font-bold leading-[1.08] sm:text-5xl", inverse ? "text-white" : "text-primary")}>{title}</h2>
      {copy && <p className={cn("mt-5 text-base leading-7 sm:text-lg", inverse ? "text-white/70" : "text-muted")}>{copy}</p>}
    </div>
  );
}
