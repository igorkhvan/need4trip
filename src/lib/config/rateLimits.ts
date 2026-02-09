/**
 * Rate Limiting Configuration
 * 
 * Tier-based rate limits for all API endpoints
 * Used by middleware.ts for request throttling
 * 
 * @see docs/RATE_LIMITING_STRATEGY.md
 */

// ============================================================================
// Rate Limit Tiers
// ============================================================================

export const RATE_LIMIT_TIERS = {
  /**
   * CRITICAL: Auth endpoints, high-cost operations
   * 3 requests per minute per identifier (IP)
   */
  critical: {
    requests: 3,
    window: '1 m',
    description: 'Auth & high-cost operations',
  },
  
  /**
   * WRITE: Create/Update/Delete operations
   * 10 requests per minute per user
   */
  write: {
    requests: 10,
    window: '1 m',
    description: 'Write operations (POST/PUT/PATCH/DELETE)',
  },
  
  /**
   * READ: GET requests, public data
   * 60 requests per minute per user/IP
   */
  read: {
    requests: 60,
    window: '1 m',
    description: 'Read operations (GET)',
  },
  
  /**
   * GUEST: Anonymous participant registrations
   * 5 requests per minute per IP
   */
  guest: {
    requests: 5,
    window: '1 m',
    description: 'Guest registrations',
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

// ============================================================================
// Endpoint to Tier Mapping
// ============================================================================

/**
 * Maps API routes to rate limit tiers
 * 
 * Format:
 * - Exact match: '/api/auth/telegram'
 * - Prefix match: '/api/events' (matches /api/events/*)
 * - Method-specific: Use getRateLimitTier() with method check
 */
export const ROUTE_TIER_MAP: Record<string, RateLimitTier> = {
  // =========================================================================
  // CRITICAL TIER (3/min) 🔴
  // =========================================================================
  
  '/api/auth/telegram': 'critical',
  '/api/ai/events/generate-rules': 'critical',
  
  // =========================================================================
  // GUEST TIER (5/min) 🔵
  // Special: Allow anonymous but limited
  // =========================================================================
  
  '/api/events/[id]/participants': 'guest',
  '/api/events/[id]/participants/[participantId]': 'guest',
  
  // =========================================================================
  // WRITE TIER (10/min) 🟡
  // Applied to POST/PUT/PATCH/DELETE methods only
  // =========================================================================
  
  // Events
  '/api/events:POST': 'write',
  '/api/events/[id]:PUT': 'write',
  '/api/events/[id]:DELETE': 'write',
  
  // Clubs
  '/api/clubs:POST': 'write',
  '/api/clubs/[id]:PATCH': 'write',
  '/api/clubs/[id]:DELETE': 'write',
  '/api/clubs/[id]/members:POST': 'write',
  '/api/clubs/[id]/members/[userId]:PATCH': 'write',
  '/api/clubs/[id]/members/[userId]:DELETE': 'write',
  '/api/clubs/[id]/export:GET': 'write', // Expensive operation
  
  // Profile
  '/api/profile:PATCH': 'write',
  '/api/profile/notifications:PATCH': 'write',
  '/api/profile/cars:POST': 'write',
  '/api/profile/cars:PUT': 'write',
  '/api/profile/cars:PATCH': 'write',
  '/api/profile/cars:DELETE': 'write',
  
  // Auth
  '/api/auth/logout:POST': 'write',
  
  // Feedback
  '/api/feedback:POST': 'write',
  
  // =========================================================================
  // READ TIER (60/min) 🟢
  // Default for all other GET requests
  // =========================================================================
  
  // Explicitly mapped for documentation, but READ is the default
  '/api/events:GET': 'read',
  '/api/events/[id]:GET': 'read',
  '/api/clubs:GET': 'read',
  '/api/clubs/[id]:GET': 'read',
  '/api/clubs/[id]/members:GET': 'read',
  '/api/clubs/[id]/current-plan:GET': 'read',
  '/api/profile:GET': 'read',
  '/api/profile/notifications:GET': 'read',
  '/api/profile/cars:GET': 'read',
  '/api/auth/me:GET': 'read',
  
  // Reference data
  '/api/cities': 'read',
  '/api/cities/[id]': 'read',
  '/api/currencies': 'read',
  '/api/car-brands': 'read',
  '/api/event-categories': 'read',
  '/api/vehicle-types': 'read',
  '/api/plans': 'read',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get rate limit tier for a route and method
 * 
 * @param pathname - Request pathname (e.g. '/api/events/123')
 * @param method - HTTP method (GET, POST, etc.)
 * @returns Rate limit tier or 'read' as default
 */
export function getRateLimitTier(pathname: string, method: string): RateLimitTier {
  // 1. Check exact match with method
  const withMethod = `${pathname}:${method}`;
  if (withMethod in ROUTE_TIER_MAP) {
    return ROUTE_TIER_MAP[withMethod];
  }
  
  // 2. Check exact match without method
  if (pathname in ROUTE_TIER_MAP) {
    return ROUTE_TIER_MAP[pathname];
  }
  
  // 3. Check prefix matches (normalized paths)
  // Convert /api/events/123/participants -> /api/events/[id]/participants
  const normalized = normalizePathname(pathname);
  
  const normalizedWithMethod = `${normalized}:${method}`;
  if (normalizedWithMethod in ROUTE_TIER_MAP) {
    return ROUTE_TIER_MAP[normalizedWithMethod];
  }
  
  if (normalized in ROUTE_TIER_MAP) {
    return ROUTE_TIER_MAP[normalized];
  }
  
  // 4. Default: READ tier for GET, WRITE tier for mutations
  if (method === 'GET') {
    return 'read';
  }
  
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return 'write';
  }
  
  // Fallback
  return 'read';
}

/**
 * Normalize pathname by replacing UUIDs with [id] placeholder
 * 
 * @example
 * '/api/events/123e4567-e89b-12d3-a456-426614174000' -> '/api/events/[id]'
 * '/api/clubs/abc/members/def' -> '/api/clubs/[id]/members/[userId]'
 */
function normalizePathname(pathname: string): string {
  // UUID regex pattern
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  
  let normalized = pathname.replace(uuidPattern, '[id]');
  
  // Handle specific patterns
  if (normalized.includes('/members/[id]')) {
    normalized = normalized.replace('/members/[id]', '/members/[userId]');
  }
  
  if (normalized.includes('/participants/[id]')) {
    normalized = normalized.replace('/participants/[id]', '/participants/[participantId]');
  }
  
  return normalized;
}

/**
 * Get identifier for rate limiting
 * 
 * @param userId - Authenticated user ID (from middleware)
 * @param ip - Client IP address
 * @returns Identifier string for rate limit key
 */
export function getRateLimitIdentifier(userId: string | null, ip: string | null): string {
  // Prefer userId for authenticated requests
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP for anonymous requests
  if (ip) {
    return `ip:${ip}`;
  }
  
  // Ultimate fallback (should never happen in middleware)
  return 'unknown';
}

/**
 * Get client IP from request
 * Handles Vercel's forwarded headers
 */
export function getClientIp(request: Request): string | null {
  // Check Vercel-specific header
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be: "client, proxy1, proxy2"
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback to x-real-ip
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return null;
}
