import { PackageSearch } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex min-h-[min(28rem,calc(100vh-14rem))] flex-col items-center justify-center rounded-lg border border-dashed border-navy-100 bg-white p-8 text-center">
      <PackageSearch className="mb-4 h-10 w-10 text-logistics-orange" aria-hidden />
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>
      {actionHref && actionLabel ? (
        <ButtonLink href={actionHref} className="mt-5">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}
