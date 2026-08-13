const STALE_AUTH_KEYS = [
  "octo_admin_user",
  "loqistika-classifieds-owner-auth",
  "loqistika-classifieds-admin-auth",
] as const;

export function clearStaleAuthKeys(): void {
  if (typeof window === "undefined") return;

  for (const key of STALE_AUTH_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}