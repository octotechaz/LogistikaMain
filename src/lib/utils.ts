import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value?: number | string | { toString(): string } | null) {
  if (value === undefined || value === null || value === "") {
    return "Razılaşma ilə";
  }

  const rawValue = typeof value === "object" ? value.toString() : value;
  const amount = typeof rawValue === "string" ? Number(rawValue) : rawValue;

  if (Number.isNaN(amount)) {
    return "Razılaşma ilə";
  }

  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(value?: Date | string | null) {
  if (!value) {
    return "Tarix seçilməyib";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

export function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "AZ";
}
