export const favoriteListingsStorageKey = "loqistika-favorite-listings";
export const favoriteListingsStorageEvent = "favorite-listings-change";

function normalizeFavoriteId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const id = String(value).trim();
  return id ? id : null;
}

export function normalizeFavoriteListingIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const unique = new Set<string>();
  for (const item of ids) {
    const id = normalizeFavoriteId(item);
    if (id) {
      unique.add(id);
    }
  }

  return Array.from(unique);
}

export function getStoredFavoriteListingIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(favoriteListingsStorageKey);
    if (!raw) {
      return [];
    }

    return normalizeFavoriteListingIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function setStoredFavoriteListingIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const next = normalizeFavoriteListingIds(ids);
  window.localStorage.setItem(favoriteListingsStorageKey, JSON.stringify(next));
  window.dispatchEvent(new Event(favoriteListingsStorageEvent));
}
