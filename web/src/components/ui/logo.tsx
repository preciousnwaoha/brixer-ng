import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex shrink-0 items-center gap-2.5" aria-label="Brixer home">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black tracking-tight", inverse ? "bg-white text-primary" : "bg-primary text-white")}>Bx</span>
      {!compact && (
        <span className="flex shrink-0 flex-col items-start">
          <span className={cn("text-xl font-extrabold leading-6 tracking-tight", inverse ? "text-white" : "text-primary")}>
            Brix<span className={inverse ? "text-alt-sage" : "text-secondary"}>er</span>
          </span>
          <span className={cn("mt-0.5 whitespace-nowrap text-[10px] font-medium leading-3", inverse ? "text-white/75" : "text-muted")}>
            The Brand Fixer
          </span>
        </span>
      )}
    </Link>
  );
}
