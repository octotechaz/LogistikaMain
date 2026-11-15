"use client";

import { Heart } from "lucide-react";
import { useFavoriteListings } from "@/hooks/useFavoriteListings";
import { useLocale } from "@/hooks/useLocale";
import { FastLink } from "@/components/ui/FastLink";
import { cn } from "@/lib/utils";

export function FavoriteNavLink({
  className,
  compact = false,
  variant = "topbar"
}: {
  className?: string;
  compact?: boolean;
  variant?: "default" | "topbar";
}) {
  const { favoriteCount, mounted } = useFavoriteListings();
  const { t } = useLocale();
  const badgeCount = mounted ? favoriteCount : 0;

  if (variant === "topbar") {
    return (
      <FastLink
        href="/favorites"
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 transition-colors hover:text-neutral-900 focus:outline-none",
          className
        )}
        aria-label={`${t("fav_label", "Seçilmişlər")}${badgeCount > 0 ? `, ${badgeCount}` : ""}`}
      >
        <span className="relative inline-flex items-center justify-center">
          <Heart
            className={cn(
              "h-[18px] w-[18px] text-slate-700 transition-colors",
              badgeCount > 0 ? "fill-red-500 text-red-500" : ""
            )}
            strokeWidth={1.75}
          />
          {badgeCount > 0 && (
            <span className="absolute -right-2 -top-1.5 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </span>
        {!compact ? <span className="hidden md:inline">{t("fav_label", "Seçilmişlər")}</span> : null}
      </FastLink>
    );
  }

  return (
    <FastLink
      href="/favorites"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-logistics-orange transition hover:bg-orange-50 focus:outline-none",
        compact && "w-9 px-0",
        className
      )}
      aria-label={`${t("fav_label", "Seçilmişlər")}, ${badgeCount} ${t("fav_listing_unit", "elan")}`}
    >
      <span className="relative inline-flex items-center justify-center">
        <Heart
          className={cn(
            "h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]",
            badgeCount > 0 ? "text-logistics-orange fill-logistics-orange" : "text-logistics-orange"
          )}
        />
        <span className="absolute -right-[7px] -top-[7px] inline-flex min-w-[15px] h-[15px] items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold leading-none text-logistics-orange shadow-sm">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      </span>
      {!compact ? <span className="hidden sm:inline">{t("fav_label", "Seçilmişlər")}</span> : null}
    </FastLink>
  );
}
