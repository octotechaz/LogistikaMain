import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FastLink } from "@/components/ui/FastLink";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const buttonVariants = {
  primary: "bg-logistics-orange text-white shadow-sm hover:bg-orange-600",
  secondary: "border border-navy-100 bg-white text-navy-900 hover:bg-navy-50",
  ghost: "text-navy-700 hover:bg-navy-50",
  danger: "bg-red-600 text-white hover:bg-red-700"
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  children,
  className,
  variant = "primary"
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: keyof typeof buttonVariants;
}) {
  return (
    <FastLink
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-px",
        buttonVariants[variant],
        className
      )}
    >
      {children}
    </FastLink>
  );
}
