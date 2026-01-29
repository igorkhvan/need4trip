/**
 * Internal API Fetch Helper for Server Components
 * 
 * Provides consistent cookie forwarding for SSR/RSC internal API calls.
 * Ensures auth cookies are properly propagated to internal API routes.
 * 
 * Usage in Server Components:
 * ```typescript
 * import { internalApiFetch } from "@/lib/http/internalApiFetch";
 * 
 * const res = await internalApiFetch(`/api/clubs/${clubId}/members/preview`);
 * const data = await res.json();
 * ```
 * 
 * @see docs/adr/ADR-001.md - Auth Resolution Architecture Decision
 */
import 'server-only';

import { headers } from "next/headers";

/**
 * Get base URL for internal API calls
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Fetch helper for internal API calls from Server Components.
 * 
 * Features:
 * - Automatically forwards cookies from incoming request
 * - Defaults to cache: 'no-store' for dynamic data
 * - Uses absolute URL based on NEXT_PUBLIC_APP_URL
 * 
 * @param path - API path (e.g., "/api/clubs/123/members/preview")
 * @param init - Optional RequestInit options (merged with defaults)
 * @returns Fetch Response
 */
export async function internalApiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = getBaseUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  
  // Get incoming request headers (includes cookies)
  const requestHeaders = await headers();
  
  // Build headers for the internal fetch
  // Forward Cookie header for auth propagation
  const fetchHeaders = new Headers(init?.headers);
  
  // Forward cookie header if present (critical for auth)
  const cookie = requestHeaders.get('cookie');
  if (cookie && !fetchHeaders.has('cookie')) {
    fetchHeaders.set('cookie', cookie);
  }
  
  // Merge with provided init
  const mergedInit: RequestInit = {
    cache: 'no-store', // Default: dynamic, no caching
    ...init,
    headers: fetchHeaders,
  };
  
  return fetch(url, mergedInit);
}

/**
 * Convenience function for GET requests
 */
export async function internalApiGet(
  path: string,
  init?: Omit<RequestInit, 'method'>
): Promise<Response> {
  return internalApiFetch(path, { ...init, method: 'GET' });
}

/**
 * Convenience function for POST requests
 */
export async function internalApiPost(
  path: string,
  body?: unknown,
  init?: Omit<RequestInit, 'method' | 'body'>
): Promise<Response> {
  return internalApiFetch(path, {
    ...init,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    },
  });
}
