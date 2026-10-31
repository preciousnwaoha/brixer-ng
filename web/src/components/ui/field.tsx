import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField({ label, error, hint, className, id, ...props }, ref) {
  const inputId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-semibold text-primary" htmlFor={inputId}>
      {label}
      <input
        ref={ref}
        id={inputId}
        className={cn("h-12 rounded-xl border border-line bg-white px-4 text-[15px] font-normal text-ink shadow-sm transition placeholder:text-muted/60 focus:border-alt-sage focus:outline-none focus:ring-4 focus:ring-alt-sage/10", error && "border-red-400", className)}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
});

export function TextArea({ label, error, hint, className, id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string }) {
  const inputId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-semibold text-primary" htmlFor={inputId}>
      {label}
      <textarea id={inputId} className={cn("min-h-28 resize-y rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-normal text-ink shadow-sm focus:border-alt-sage focus:outline-none focus:ring-4 focus:ring-alt-sage/10", error && "border-red-400", className)} {...props} />
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}
