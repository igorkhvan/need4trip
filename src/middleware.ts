/**
 * Next.js Middleware for Authentication & Authorization
 * 
 * Responsibilities:
 * 1. Verify JWT token for protected API routes
 * 2. Attach user ID to request headers for route handlers
 * 3. Return 401 for unauthorized requests
 * 4. Protect admin/cron endpoints with secrets
 * 
 * Architecture:
 * - Runs on Edge Runtime (fast, globally distributed)
 * - JWT verification happens once per request
 * - Route handlers receive pre-validated user ID
 * 
 * @see docs/architecture/security.md
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeAuthToken } from '@/lib/auth/currentUser';

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
  '/api/auth/logout',
  
  // Clubs (write operations)
  { path: '/api/clubs', methods: ['POST'] },
  { path: '/api/clubs/', methods: ['PATCH', 'DELETE'] }, // /api/clubs/[id]
  
  // Events (write operations only, GET is public)
  { path: '/api/events', methods: ['POST'] },
  { path: '/api/events/', methods: ['PUT'] }, // /api/events/[id] - PUT only, PATCH/DELETE handled separately
  
  // NOTE: Participants routes (/api/events/[id]/participants) are NOT protected
  // They allow guest registrations and guest management
  // Authorization is handled in the route handler via guest_session_id
] as const;

/**
 * Admin routes that require ADMIN_SECRET header
 */
const ADMIN_ROUTES = [
  '/api/admin/cache/clear',
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
  
  // Check protected routes
  for (const route of PROTECTED_ROUTES) {
    if (typeof route === 'string') {
      // Exact or prefix match, any method
      if (pathname === route || pathname.startsWith(`${route}/`)) {
        return true;
      }
    } else {
      // Method-specific protection
      if ((pathname === route.path || pathname.startsWith(route.path)) && 
          route.methods.includes(method as any)) {
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

// ============================================================================
// Middleware Function
// ============================================================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  
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
    const cronSecret = request.headers.get('authorization');
    const envSecret = process.env.CRON_SECRET;
    
    if (!envSecret) {
      // Cron routes disabled if CRON_SECRET not configured
      return forbiddenResponse('Cron access not configured');
    }
    
    // Expect: "Bearer <secret>"
    const expectedAuth = `Bearer ${envSecret}`;
    if (cronSecret !== expectedAuth) {
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
    return NextResponse.next();
  }
  
  // =========================================================================
  // 4. Verify JWT Token
  // =========================================================================
  
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return unauthorizedResponse('Authentication required. Please log in.');
  }
  
  // Decode and verify JWT
  const payload = decodeAuthToken(token);
  
  if (!payload) {
    return unauthorizedResponse('Invalid or expired token. Please log in again.');
  }
  
  // =========================================================================
  // 5. Attach user ID to request headers
  // =========================================================================
  
  // Clone request headers and add user ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  
  // Pass modified request to route handler
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
