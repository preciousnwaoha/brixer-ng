import { Check } from "lucide-react";
import type { OrderStage } from "@/types";
import { cn } from "@/lib/utils";

const stages: { id: OrderStage; label: string }[] = [
  { id: "received", label: "Received" },
  { id: "filing", label: "Filing" },
  { id: "submitted", label: "Submitted" },
  { id: "processing", label: "Processing" },
  { id: "completed", label: "Completed" }
];

export function ProgressTracker({ stage = "submitted", compact = false }: { stage?: OrderStage; compact?: boolean }) {
  const activeIndex = stages.findIndex((item) => item.id === stage);
  return (
    <div className="relative grid grid-cols-5">
      <div className="absolute left-[10%] right-[10%] top-3.5 h-0.5 bg-line" />
      <div className="absolute left-[10%] top-3.5 h-0.5 bg-primary transition-all" style={{ width: `${Math.min(activeIndex / 4, 1) * 80}%` }} />
      {stages.map((item, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div key={item.id} className="relative z-10 grid justify-items-center gap-2 text-center">
            <span className={cn("grid size-7 place-items-center rounded-full text-[11px] font-extrabold", done && "bg-primary text-white", active && "bg-secondary text-white ring-4 ring-secondary/15", !done && !active && "bg-[#e5e9e7] text-muted")}>
              {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>
            {!compact && <span className={cn("text-[9px] font-bold sm:text-[10px]", active ? "text-secondary" : "text-muted")}>{item.label}</span>}
          </div>
        );
      })}
    </div>
  );
}
