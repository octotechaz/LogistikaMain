"use client";

import { Heart } from "lucide-react";
import { useFavoriteListings } from "@/hooks/useFavoriteListings";
import { cn } from "@/lib/utils";

export function FavoriteToggleButton({
  listingId,
  className,
  iconClassName,
  labelClassName,
  showLabel = false,
  activeLabel = "Seçilmişlərdə",
  inactiveLabel = "Seçilmişlərə əlavə et",
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
  const { isFavorite, toggleFavorite } = useFavoriteListings();
  const favorite = isFavorite(listingId);

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
        <span className={cn(labelClassName)}>{favorite ? activeLabel : inactiveLabel}</span>
      ) : null}
    </button>
  );
}
