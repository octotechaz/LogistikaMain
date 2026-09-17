import Link from "next/link";
import { ArrowRight, Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  carrier: Truck,
  owner: Package
};

export function RoleSelectionCard({
  type,
  title,
  description,
  href
}: {
  type: "carrier" | "owner";
  title: string;
  description: string;
  href: string;
}) {
  const Icon = icons[type];

  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-48 flex-col justify-between rounded-lg border border-white/70 bg-white/95 p-6 shadow-soft transition hover:-translate-y-1 hover:border-logistics-orange hover:shadow-xl",
        "focus:outline-none focus:ring-4 focus:ring-orange-200"
      )}
    >
      <div>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-navy-900 text-white">
          <Icon className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="text-2xl font-bold text-navy-900">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-logistics-orange">
        Davam et
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
      </span>
    </Link>
  );
}
