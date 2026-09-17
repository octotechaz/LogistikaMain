"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  favoriteListingsStorageEvent,
  getStoredFavoriteListingIds,
  normalizeFavoriteListingIds,
  setStoredFavoriteListingIds
} from "@/lib/storage/favorites";

type Listener = () => void;

let memoryIds: string[] = [];
let memoryReady = false;
let windowBound = false;
let subscriberCount = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function syncFromStorage() {
  if (typeof window === "undefined") {
    return;
  }
  const next = getStoredFavoriteListingIds();
  const unchanged =
    memoryReady &&
    memoryIds.length === next.length &&
    memoryIds.every((id, index) => id === next[index]);

  memoryIds = next;
  memoryReady = true;

  if (!unchanged) {
    emit();
  }
}

function onWindowSync() {
  syncFromStorage();
}

function bindWindowListeners() {
  if (windowBound || typeof window === "undefined") {
    return;
  }
  window.addEventListener("storage", onWindowSync);
  window.addEventListener(favoriteListingsStorageEvent, onWindowSync);
  windowBound = true;
}

function unbindWindowListeners() {
  if (!windowBound || typeof window === "undefined") {
    return;
  }
  window.removeEventListener("storage", onWindowSync);
  window.removeEventListener(favoriteListingsStorageEvent, onWindowSync);
  windowBound = false;
}

function readFavorites(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  memoryIds = getStoredFavoriteListingIds();
  memoryReady = true;
  return memoryIds;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  subscriberCount += 1;
  bindWindowListeners();

  if (!memoryReady) {
    readFavorites();
  }

  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      unbindWindowListeners();
    }
  };
}

function getSnapshot() {
  if (!memoryReady && typeof window !== "undefined") {
    return readFavorites();
  }
  return memoryIds;
}

function getServerSnapshot() {
  return [] as string[];
}

function writeFavorites(ids: Array<string | number>) {
  const next = normalizeFavoriteListingIds(ids);
  const current = memoryReady ? memoryIds : getStoredFavoriteListingIds();
  const unchanged =
    current.length === next.length && current.every((id, index) => id === next[index]);

  if (unchanged) {
    memoryIds = current;
    memoryReady = true;
    return current;
  }

  // Persist first; custom event listener will sync memoryIds via syncFromStorage.
  // Also update memory immediately so same-tick readers see the new value.
  memoryIds = next;
  memoryReady = true;
  setStoredFavoriteListingIds(next);
  emit();
  return next;
}

export function useFavoriteListings() {
  const favoriteIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    readFavorites();
    emit();
    setMounted(true);
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const toggleFavorite = useCallback((listingId: string | number) => {
    const id = String(listingId).trim();
    if (!id) {
      return false;
    }

    const current = getStoredFavoriteListingIds();
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];

    writeFavorites(next);
    return next.includes(id);
  }, []);

  const replaceFavorites = useCallback((ids: Array<string | number>) => {
    writeFavorites(ids);
  }, []);

  const isFavorite = useCallback(
    (listingId: string | number) => favoriteSet.has(String(listingId).trim()),
    [favoriteSet]
  );

  return {
    favoriteIds: mounted ? favoriteIds : [],
    favoriteCount: mounted ? favoriteIds.length : 0,
    isFavorite,
    toggleFavorite,
    replaceFavorites,
    mounted
  };
}
