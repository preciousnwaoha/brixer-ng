import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const styles = {
  primary: "bg-secondary text-white hover:bg-secondary-2 shadow-[0_12px_32px_rgba(107,62,38,.18)]",
  dark: "bg-primary text-white hover:bg-primary-2 shadow-[0_12px_32px_rgba(27,67,50,.16)]",
  outline: "border border-primary/30 bg-white text-primary hover:border-primary hover:bg-alt-mint",
  light: "bg-white text-primary hover:bg-alt-mint",
  ghost: "text-primary hover:bg-alt-mint"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof styles;
  href?: string;
  children: ReactNode;
};

export function Button({ variant = "primary", href, className, children, ...props }: ButtonProps) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition duration-200 focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50",
    styles[variant], className
  );

  if (href) return <Link className={classes} href={href}>{children}</Link>;
  return <button className={classes} {...props}>{children}</button>;
}
