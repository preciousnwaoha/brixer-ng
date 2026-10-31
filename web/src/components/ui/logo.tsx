import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Brixer home">
      <span className={cn("grid size-10 place-items-center rounded-xl text-sm font-black tracking-tight", inverse ? "bg-white text-primary" : "bg-primary text-white")}>Bx</span>
      {!compact && <span className={cn("text-xl font-extrabold tracking-tight", inverse ? "text-white" : "text-primary")}>Brix<span className={inverse ? "text-alt-sage" : "text-secondary"}>er</span></span>}
    </Link>
  );
}
