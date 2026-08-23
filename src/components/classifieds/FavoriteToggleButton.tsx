"use client";

import { Heart } from "lucide-react";
import { useFavoriteListings } from "@/hooks/useFavoriteListings";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

export function FavoriteToggleButton({
  listingId,
  className,
  iconClassName,
  labelClassName,
  showLabel = false,
  activeLabel,
  inactiveLabel,
  onToggle
}: {
  listingId: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  showLabel?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  onToggle?: () => void;
}) {
  const { t } = useLocale();
  const { isFavorite, toggleFavorite } = useFavoriteListings();
  const favorite = isFavorite(listingId);
  const resolvedActiveLabel = activeLabel ?? t("fav_in_favorites", "Seçilmişlərdə");
  const resolvedInactiveLabel = inactiveLabel ?? t("fav_add", "Seçilmişlərə əlavə et");

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(listingId);
        onToggle?.();
      }}
      aria-pressed={favorite}
      className={cn(className)}
    >
      <Heart
        className={cn(
          "transition duration-200",
          favorite && "fill-logistics-orange text-logistics-orange",
          iconClassName
        )}
      />
      {showLabel ? (
        <span className={cn(labelClassName)}>{favorite ? resolvedActiveLabel : resolvedInactiveLabel}</span>
      ) : null}
    </button>
  );
}
