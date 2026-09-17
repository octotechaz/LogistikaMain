import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Building2,
  Car,
  Droplets,
  FlaskConical,
  Hammer,
  Home,
  LayoutGrid,
  Package2,
  Snowflake,
  Tractor,
  Truck,
  Wheat,
} from "lucide-react";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  grid: LayoutGrid,
  all: LayoutGrid,
  home: Home,
  house: Home,
  couch: Package2,
  hammer: Hammer,
  construction: Building2,
  box: Boxes,
  boxes: Boxes,
  package: Package2,
  "apple-whole": Wheat,
  food: Package2,
  flask: FlaskConical,
  car: Car,
  truck: Truck,
  liquid: Droplets,
  droplet: Droplets,
  snowflake: Snowflake,
  cold: Snowflake,
  tractor: Tractor,
  agri: Wheat,
  wheat: Wheat,
};

/** Map stored category icon keys to Lucide icons; unknown keys get a neutral placeholder. */
export function resolveCategoryIcon(iconKey: string | null | undefined): LucideIcon {
  const key = (iconKey || "").trim().toLowerCase();
  if (!key) {
    return Boxes;
  }

  return CATEGORY_ICON_MAP[key] ?? Boxes;
}
