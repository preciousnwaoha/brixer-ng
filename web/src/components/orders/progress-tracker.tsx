import { Check } from "lucide-react";
import type { OrderStage } from "@/types";
import { cn } from "@/lib/utils";
import { orderStages } from "@/lib/order-status";

const stages = orderStages;
const labels = {
  received: <>Re<wbr />ceived</>,
  submitted: <>Sub<wbr />mitted</>,
  processing: <>Pro<wbr />cessing</>,
  completed: <>Com<wbr />pleted</>
};

export function ProgressTracker({ stage = "submitted", compact = false, issue = false }: { stage?: OrderStage; compact?: boolean; issue?: boolean }) {
  const activeIndex = stages.findIndex((item) => item.id === stage);
  return (
    <div className="relative grid min-w-0 grid-cols-6" aria-label={`Order progress: ${stages[activeIndex]?.label}${issue ? ", issue needs attention" : ""}`}>
      <div className="absolute left-[8.333%] right-[8.333%] top-3.5 h-0.5 bg-line" />
      <div className="absolute left-[8.333%] top-3.5 h-0.5 bg-primary transition-all" style={{ width: `${Math.min(activeIndex / 5, 1) * (100 - 100 / 6)}%` }} />
      {stages.map((item, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div key={item.id} aria-current={active ? "step" : undefined} className="relative z-10 grid min-w-0 content-start justify-items-center gap-2 text-center">
            <span className={cn("grid size-7 place-items-center rounded-full text-[11px] font-extrabold", done && "bg-primary text-white", active && (issue ? "bg-red-600 text-white ring-4 ring-red-100" : "bg-secondary text-white ring-4 ring-secondary/15"), !done && !active && "bg-[#e5e9e7] text-muted")}>
              {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>
            {!compact && <span aria-label={item.label} className={cn("w-full max-w-full px-0.5 text-[8px] font-bold leading-3 [overflow-wrap:anywhere]", active ? issue ? "text-red-700" : "text-secondary" : "text-muted")}>{item.id in labels ? labels[item.id as keyof typeof labels] : item.label}</span>}
          </div>
        );
      })}
    </div>
  );
}
