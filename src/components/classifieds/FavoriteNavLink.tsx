"use client";

import { Heart } from "lucide-react";
import { useFavoriteListings } from "@/hooks/useFavoriteListings";
import { useLocale } from "@/hooks/useLocale";
import { FastLink } from "@/components/ui/FastLink";
import { cn } from "@/lib/utils";

export function FavoriteNavLink({
  className,
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) {
  const { favoriteCount, mounted } = useFavoriteListings();
  const { t } = useLocale();
  const badgeCount = mounted ? favoriteCount : 0;

  return (
    <FastLink
      href="/favorites"
      className={cn(
        "inline-flex h-[36px] sm:h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 sm:px-4 text-[0.95rem] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-navy-500",
        compact && "w-[36px] sm:w-11 px-0",
        className
      )}
      aria-label={`${t("fav_label", "Seçilmişlər")}, ${badgeCount} ${t("fav_listing_unit", "elan")}`}
    >
      <span className="relative inline-flex items-center justify-center">
        <Heart
          className={cn(
            "h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]",
            badgeCount > 0 ? "text-logistics-orange fill-logistics-orange" : "text-slate-500"
          )}
        />
        <span className="absolute -right-[7px] -top-[7px] inline-flex min-w-[15px] h-[15px] items-center justify-center rounded-full bg-navy-900 px-1 text-[9px] font-bold leading-none text-white shadow-sm ring-1 ring-white">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      </span>
      {!compact ? <span className="hidden sm:inline">{t("fav_label", "Seçilmişlər")}</span> : null}
    </FastLink>
  );
}
