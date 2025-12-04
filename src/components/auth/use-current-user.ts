"use client";

import { useEffect, useState } from "react";

import { User } from "@/lib/types/user";

interface UseCurrentUserResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = (await res.json()) as { user?: User };
        if (!cancelled) {
          setUser(data.user ?? null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, isLoading, isAuthenticated: Boolean(user) };
}
