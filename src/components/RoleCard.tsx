import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function RoleCard({
  href,
  title,
  description,
  icon: Icon
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-navy-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-logistics-orange hover:shadow-soft"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-900 text-white">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="mt-5 text-xl font-bold text-navy-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-logistics-orange">
        Davam et
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
      </span>
    </Link>
  );
}
