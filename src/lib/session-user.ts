export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
};

function browserHost() {
  return typeof window === "undefined" ? "" : window.location.hostname.toLowerCase();
}

function isPortalHost() {
  const host = browserHost();
  return host === "portal.tranzit.az" ||
    host === "portal.lvh.me" ||
    host === "portal.tranzit.test" ||
    host.startsWith("portal.");
}

function isAdminHost() {
  const host = browserHost();
  return host === "admin.tranzit.az" ||
    host === "admin.lvh.me" ||
    host === "admin.tranzit.test" ||
    host.startsWith("admin.");
}

function isPublicOrPortalHost() {
  const host = browserHost();
  return !host || isPortalHost() || isAdminHost() || host === "tranzit.az" || host === "lvh.me" || host === "tranzit.test";
}

export async function fetchSessionUser(): Promise<SessionUser | null> {
  // /api/auth/me belongs to the portal host. Shared public/admin components
  // can render without making a guaranteed 404 request on those hosts.
  if (!isPortalHost()) return null;

  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });

    if (!res.ok) return null;

    const json = await res.json();
    return (json?.data?.user as SessionUser) ?? null;
  } catch {
    return null;
  }
}

export type LegacySessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  profile_picture: string | null;
};

export async function fetchLegacySessionUser(): Promise<LegacySessionUser | null> {
  // The Express session endpoint is useful on the portal/admin dashboard,
  // but is intentionally unavailable on the public marketing host.
  if (!isPublicOrPortalHost()) return null;

  try {
    const res = await fetch("/dashboard/session-user", {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });

    if (!res.ok) return null;

    const json = await res.json();
    const u = json?.user;
    if (
      u == null ||
      (typeof u.id !== "string" && typeof u.id !== "number") ||
      typeof u.name !== "string" ||
      typeof u.email !== "string" ||
      typeof u.role !== "string"
    ) {
      return null;
    }
    return {
      id: String(u.id),
      name: u.name,
      email: u.email,
      role: u.role,
      profile_picture: u.profile_picture ?? null
    };
  } catch {
    return null;
  }
}
