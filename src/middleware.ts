/**
 * Next.js Middleware for Authentication, Authorization & Rate Limiting
 * 
 * Responsibilities:
 * 1. Rate limiting (Upstash Redis)
 * 2. Verify JWT token for protected API routes
 * 3. Attach user ID to request headers for route handlers
 * 4. Return 401 for unauthorized requests
 * 5. Protect admin/cron endpoints with secrets
 * 
 * Architecture:
 * - Runs on Edge Runtime (fast, globally distributed)
 * - Rate limiting happens first (before auth)
 * - JWT verification happens once per request
 * - Route handlers receive pre-validated user ID
 * 
 * @see docs/architecture/security.md
 * @see docs/RATE_LIMITING_STRATEGY.md
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { decodeAuthToken } from '@/lib/auth/jwt';
import {
  getRateLimitTier,
  getRateLimitIdentifier,
  getClientIp,
  RATE_LIMIT_TIERS,
} from '@/lib/config/rateLimits';
import { trackError as trackAbuseError } from '@/lib/telemetry/abuseTelemetry';
import type { RateLimitHeaders } from '@/types/middleware';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Routes that require authentication
 * 
 * Pattern matching:
 * - Exact match: '/api/profile'
 * - Prefix match: '/api/events' (matches /api/events/*)
 * - Method-specific: { path: '/api/events', methods: ['POST', 'PUT', 'DELETE'] }
 */
const PROTECTED_ROUTES = [
  // Profile endpoints (all methods)
  '/api/profile',
  '/api/profile/notifications',
  '/api/profile/cars',
  
  // Auth endpoints
  '/api/auth/me',
  // NOTE: /api/auth/logout is NOT protected - must work even with expired/invalid token
  
  // AI endpoints (all require auth)
  '/api/ai',
  
  // Clubs (write operations)
  { path: '/api/clubs', methods: ['POST'] },
  { path: '/api/clubs/', methods: ['PATCH', 'DELETE'] }, // /api/clubs/[id]
  '/api/clubs/[id]/members', // All member management operations (POST, PATCH, DELETE)
  '/api/clubs/[id]/export', // Export requires member authentication
  
  // Events (write operations only, GET is public)
  { path: '/api/events', methods: ['POST'] },
  { path: '/api/events/', methods: ['PUT', 'PATCH', 'DELETE'] }, // /api/events/[id] - All write operations
  
  // Billing endpoints (all require auth)
  '/api/billing/purchase-intent',
  '/api/billing/transactions/status',
  '/api/billing/beta-grant',
  
  // Feedback (write-only, authenticated)
  { path: '/api/feedback', methods: ['POST'] },
  
  // NOTE: Participants routes (/api/events/[id]/participants) are NOT protected
  // They allow guest registrations and guest management
  // Authorization is handled in the route handler via guest_session_id
] as const;

/**
 * Admin routes that require ADMIN_SECRET header
 */
const ADMIN_ROUTES = [
  '/api/admin/cache/clear',
  '/api/admin/abuse',
  // Add more admin routes here
] as const;

/**
 * Cron routes that require CRON_SECRET header
 */
const CRON_ROUTES = [
  '/api/cron/process-notifications',
  // Add more cron routes here
] as const;

/**
 * Public routes (explicitly allowed without auth)
 * These are GET-only endpoints that don't need authentication
 */
const PUBLIC_ROUTES = [
  '/api/events', // GET list of events
  '/api/clubs', // GET list of clubs
  '/api/cities',
  '/api/currencies',
  '/api/car-brands',
  '/api/event-categories',
  '/api/vehicle-types',
  '/api/plans',
] as const;

// ============================================================================
// Rate Limiting Setup
// ============================================================================

/**
 * Initialize Upstash Redis client
 * Uses environment variables for configuration
 */
let redis: Redis | null = null;
let rateLimiters: Record<string, Ratelimit> | null = null;

function initializeRateLimiting() {
  if (rateLimiters) return rateLimiters;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.warn('[Middleware] Upstash credentials not configured. Rate limiting disabled.');
    return null;
  }
  
  try {
    redis = new Redis({
      url,
      token,
    });
    
    // Create rate limiters for each tier
    rateLimiters = {
      critical: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_TIERS.critical.requests,
          RATE_LIMIT_TIERS.critical.window
        ),
        analytics: true,
        prefix: 'ratelimit:critical',
      }),
      write: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_TIERS.write.requests,
          RATE_LIMIT_TIERS.write.window
        ),
        analytics: true,
        prefix: 'ratelimit:write',
      }),
      read: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_TIERS.read.requests,
          RATE_LIMIT_TIERS.read.window
        ),
        analytics: true,
        prefix: 'ratelimit:read',
      }),
      guest: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_TIERS.guest.requests,
          RATE_LIMIT_TIERS.guest.window
        ),
        analytics: true,
        prefix: 'ratelimit:guest',
      }),
    };
    
    return rateLimiters;
  } catch (error) {
    console.error('[Middleware] Failed to initialize rate limiting:', error);
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if route requires authentication
 */
function requiresAuth(pathname: string, method: string): boolean {
  // Check explicit public routes (GET only)
  if (method === 'GET') {
    for (const route of PUBLIC_ROUTES) {
      if (pathname === route || pathname.startsWith(`${route}/`)) {
        return false; // Public route, no auth needed
      }
    }
  }
  
  // ✅ EXCEPTION: Participants routes are NOT protected (guest access)
  // /api/events/[id]/participants (POST) - guest registration
  // /api/events/[id]/participants/[participantId] (PATCH, DELETE) - guest management
  if (pathname.includes('/participants')) {
    return false;
  }
  
  // Check protected routes
  for (const route of PROTECTED_ROUTES) {
    if (typeof route === 'string') {
      // Exact or prefix match, any method
      if (pathname === route || pathname.startsWith(`${route}/`)) {
        return true;
      }
    } else {
      // Method-specific protection
      const pathMatches = route.path.endsWith('/') 
        ? pathname.startsWith(route.path) // Prefix match for paths with trailing slash
        : pathname === route.path; // Exact match for paths without trailing slash
      
      if (pathMatches && 
          // @ts-expect-error - TS inference issue with readonly array in const
          route.methods.includes(method)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if route is admin-only
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if route is cron-only
 */
function isCronRoute(pathname: string): boolean {
  return CRON_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Create unauthorized response
 */
function unauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
function forbiddenResponse(message: string = 'Access denied'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
      },
    },
    { status: 403 }
  );
}

/**
 * Create rate limit exceeded response
 */
function rateLimitResponse(limit: number, window: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Limit: ${limit} per ${window}. Please try again later.`,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': '60', // Suggest retry after 60 seconds
      },
    }
  );
}

// ============================================================================
// Middleware Function
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  
  // =========================================================================
  // 0. Rate Limiting (First - before any other checks)
  // =========================================================================
  
  // Skip rate limiting for admin/cron routes (they have secret protection)
  if (!isAdminRoute(pathname) && !isCronRoute(pathname)) {
    const limiters = initializeRateLimiting();
    
    if (limiters) {
      try {
        // Determine rate limit tier
        const tier = getRateLimitTier(pathname, method);
        const limiter = limiters[tier];
        
        if (!limiter) {
          console.warn(`[Middleware] No rate limiter found for tier: ${tier}`);
        } else {
          // Get identifier (userId if authenticated, otherwise IP)
          // NOTE: At this point we don't have userId yet (auth happens later)
          // For pre-auth endpoints, we use IP
          // For post-auth endpoints, we'll use IP now and potentially userId later
          const ip = getClientIp(request);
          const identifier = getRateLimitIdentifier(null, ip);
          
          const rateLimitStart = Date.now();
          // Check rate limit
          const { success, limit, remaining, reset } = await limiter.limit(identifier);
          const rateLimitDuration = Date.now() - rateLimitStart;
          
          // 🐛 DEBUG: Log slow rate limit checks
          if (rateLimitDuration > 100) {
            console.warn('[Middleware] ⚠️ Slow rate limit check', {
              pathname,
              duration: `${rateLimitDuration}ms`,
              tier,
            });
          }
          
          // Add rate limit headers to response
          const headers: RateLimitHeaders = {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
          };
          
          if (!success) {
            // Rate limit exceeded
            const tierConfig = RATE_LIMIT_TIERS[tier];
            console.warn('[Middleware] Rate limit exceeded', {
              pathname,
              method,
              tier,
              identifier,
              limit: tierConfig.requests,
              window: tierConfig.window,
            });
            
            // Fire-and-forget: track 429 for abuse dashboard
            trackAbuseError('429');
            
            const response = rateLimitResponse(tierConfig.requests, tierConfig.window);
            // Add rate limit headers
            Object.entries(headers).forEach(([key, value]) => {
              response.headers.set(key, value);
            });
            return response;
          }
          
          // Rate limit OK - attach headers for client visibility
          // We'll add them to the final response below
          request.rateLimitHeaders = headers;
        }
      } catch (error) {
        // Rate limiting failed - log error but allow request
        // Graceful degradation: if Redis is down, don't block requests
        console.error('[Middleware] Rate limiting error:', error);
      }
    }
  }
  
  // =========================================================================
  // 1. Admin Route Protection
  // =========================================================================
  
  if (isAdminRoute(pathname)) {
    const adminSecret = request.headers.get('x-admin-secret');
    const envSecret = process.env.ADMIN_SECRET;
    
    if (!envSecret) {
      // Admin routes disabled if ADMIN_SECRET not configured
      return forbiddenResponse('Admin access not configured');
    }
    
    if (adminSecret !== envSecret) {
      return forbiddenResponse('Invalid admin credentials');
    }
    
    // Admin authenticated, continue
    return NextResponse.next();
  }
  
  // =========================================================================
  // 2. Cron Route Protection
  // =========================================================================
  
  if (isCronRoute(pathname)) {
    // Vercel Cron Jobs automatically add this header
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    
    // Manual triggers can use Authorization header with CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const envSecret = process.env.CRON_SECRET;
    
    // Allow if either:
    // 1. Called by Vercel Cron (has x-vercel-cron header)
    // 2. Manual trigger with valid CRON_SECRET
    const isVercelCron = !!vercelCronHeader;
    const isManualWithSecret = envSecret && authHeader === `Bearer ${envSecret}`;
    
    if (!isVercelCron && !isManualWithSecret) {
      return forbiddenResponse('Invalid cron credentials');
    }
    
    // Cron authenticated, continue
    return NextResponse.next();
  }
  
  // =========================================================================
  // 3. Check if route requires authentication
  // =========================================================================
  
  const needsAuth = requiresAuth(pathname, method);
  
  if (!needsAuth) {
    // Public route, no auth needed
    // SECURITY (ADR-001): Strip incoming x-user-id to prevent spoofing on public routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete('x-user-id');
    
    // But still add rate limit headers if available
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    if (request.rateLimitHeaders) {
      Object.entries(request.rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }
    return response;
  }
  
  // =========================================================================
  // 4. Verify JWT Token
  // =========================================================================
  
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return unauthorizedResponse('Authentication required. Please log in.');
  }
  
  // Decode and verify JWT (async - Edge Runtime compatible)
  const payload = await decodeAuthToken(token);
  
  if (!payload) {
    return unauthorizedResponse('Invalid or expired token. Please log in again.');
  }
  
  // =========================================================================
  // 5. Attach user ID to request headers
  // =========================================================================
  
  // Clone request headers and add user ID
  // SECURITY (ADR-001): Strip incoming x-user-id to prevent spoofing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-user-id');
  requestHeaders.set('x-user-id', payload.userId);
  
  // Pass modified request to route handler with rate limit headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Add rate limit headers if available
  if (request.rateLimitHeaders) {
    Object.entries(request.rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

// ============================================================================
// Middleware Configuration
// ============================================================================

/**
 * Configure which routes middleware should run on
 * 
 * matcher: Run middleware only for API routes
 * - Includes: /api/*
 * - Excludes: /_next/*, /static/*, favicon.ico, etc.
 */
export const config = {
  matcher: '/api/:path*',
};
