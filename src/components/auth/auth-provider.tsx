"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { CurrentUser } from "@/lib/auth/currentUser";
import { onAuthChanged } from "@/lib/events/auth-events";

/**
 * Auth Context
 * 
 * Централизованное управление состоянием аутентификации.
 * Устраняет дублирование запросов /api/auth/me на каждой странице.
 * 
 * Architecture:
 * - SSR: Initial user загружается на сервере (getCurrentUser)
 * - CSR: Context предоставляет user всем клиентским компонентам
 * - Updates: Слушает события auth changes (login/logout)
 * 
 * Benefits:
 * - 1× API call вместо 3× на каждую page load
 * - Мгновенный доступ к user в любом компоненте
 * - Оптимистичные обновления UI
 * - Type-safe
 */

interface AuthContextValue {
  /**
   * Current authenticated user or null if guest
   */
  user: CurrentUser | null;
  
  /**
   * Loading state (только при refresh/update)
   * Initial load использует SSR, поэтому isLoading = false
   */
  isLoading: boolean;
  
  /**
   * Is user authenticated?
   */
  isAuthenticated: boolean;
  
  /**
   * Manually refresh user data from API
   * Used after profile updates or when auth state changes
   */
  refresh: () => Promise<void>;
  
  /**
   * Update user data optimistically (without API call)
   * Used for immediate UI updates
   */
  setUser: (user: CurrentUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  
  /**
   * Initial user from SSR (getCurrentUser on server)
   * If not provided, will fetch on mount (not recommended)
   */
  initialUser: CurrentUser | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  // Initialize with SSR data (no loading state needed)
  const [user, setUser] = useState<CurrentUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Refresh user data from API
   * Called when auth state changes (login/logout)
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store", // Don't cache auth checks
      });
      
      if (res.ok) {
        const response = await res.json();
        // Handle both response formats: {data: {user}} and {user}
        const userData = response.data?.user || response.user || null;
        setUser(userData);
      } else {
        // 401/403 = not authenticated
        setUser(null);
      }
    } catch (err) {
      console.error("[AuthProvider] Failed to refresh user:", err);
      // On network error, keep current user (don't logout)
      // Only set null on explicit 401/403
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Listen for auth change events
   * Triggered by login/logout actions
   */
  useEffect(() => {
    const unsubscribe = onAuthChanged(() => {
      console.log("[AuthProvider] Auth state changed, refreshing...");
      refresh();
    });

    return unsubscribe;
  }, [refresh]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    refresh,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * 
 * @throws Error if used outside AuthProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginButton />;
 *   }
 *   
 *   return <div>Hello, {user.name}!</div>;
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      "useAuth must be used within AuthProvider. " +
      "Wrap your app with <AuthProvider> in layout.tsx"
    );
  }
  
  return context;
}

/**
 * Hook to get current user (convenience wrapper)
 * Returns null if not authenticated
 * 
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const user = useCurrentUser();
 *   
 *   if (!user) {
 *     return <div>Please login</div>;
 *   }
 *   
 *   return <div>{user.name}</div>;
 * }
 * ```
 */
export function useCurrentUser(): CurrentUser | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook to check if user is authenticated
 * 
 * @example
 * ```tsx
 * function ProtectedButton() {
 *   const isAuthenticated = useIsAuthenticated();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginButton />;
 *   }
 *   
 *   return <button>Do Something</button>;
 * }
 * ```
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

