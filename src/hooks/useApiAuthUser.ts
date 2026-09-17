"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSessionUser,
  fetchLegacySessionUser,
  type SessionUser,
  type LegacySessionUser
} from "@/lib/session-user";
import { clearStaleAuthKeys } from "@/lib/stale-auth-cleanup";

export type { SessionUser, LegacySessionUser };

export function useApiAuthUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [legacyUser, setLegacyUser] = useState<LegacySessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cleanedRef = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [next, legacy] = await Promise.all([
        fetchSessionUser(),
        fetchLegacySessionUser()
      ]);
      setUser(next);
      setLegacyUser(legacy);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cleanedRef.current) {
      cleanedRef.current = true;
      clearStaleAuthKeys();
    }
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch {
      // ignore — navigate anyway
    }
    setUser(null);
    setLegacyUser(null);
    window.location.href = "/dashboard/logout";
  }, []);

  return {
    user,
    legacyUser,
    isLoading,
    refresh,
    logout
  };
}