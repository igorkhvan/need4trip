/**
 * Type augmentations for Next.js middleware
 * 
 * Extends NextRequest to support custom properties used in middleware
 * without requiring type assertions (as any).
 */

import type { NextRequest } from 'next/server';

/**
 * Rate limit headers to be attached to response
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

/**
 * Augment NextRequest with custom properties
 * 
 * This allows middleware to attach rate limit headers to the request
 * and pass them through to the response without type casting.
 */
declare module 'next/server' {
  interface NextRequest {
    rateLimitHeaders?: RateLimitHeaders;
  }
}
