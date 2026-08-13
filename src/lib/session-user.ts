export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
};

export async function fetchSessionUser(): Promise<SessionUser | null> {
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