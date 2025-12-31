/**
 * Idempotency Service Wrapper
 * 
 * Purpose: Wrap side-effect operations with idempotency guarantees
 * 
 * Usage:
 * ```typescript
 * return withIdempotency(
 *   { userId: user.id, route: 'POST /api/events', key: idempotencyKey },
 *   async () => {
 *     // Your operation here
 *     const event = await createEvent(...);
 *     return { status: 201, body: { event } };
 *   }
 * );
 * ```
 * 
 * Guarantees:
 * - Same key → same response (replay stored response)
 * - In-progress requests → 409 REQUEST_IN_PROGRESS
 * - Atomic: operation + store response
 * 
 * SSOT: docs/ssot/SSOT_ARCHITECTURE.md § Idempotency Standard
 */

import { NextResponse } from 'next/server';
import {
  getIdempotencyKey,
  createInProgressKey,
  completeIdempotencyKey,
  failIdempotencyKey,
} from '@/lib/db/idempotencyRepo';
import { log } from '@/lib/utils/logger';
import { ConflictError } from '@/lib/errors';

// ============================================================================
// Types
// ============================================================================

export interface IdempotencyContext {
  userId: string;
  route: string;  // e.g., "POST /api/events"
  key: string;    // Idempotency-Key header value
}

export interface IdempotencyResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

// ============================================================================
// Main Wrapper
// ============================================================================

/**
 * Wrap operation with idempotency guarantees
 * 
 * Behavior:
 * 1. Check if key exists and is completed → replay stored response
 * 2. Check if key exists and is in_progress → return 409 REQUEST_IN_PROGRESS
 * 3. Create in_progress key → execute operation → store response as completed
 * 4. On error → mark key as failed (allow retry with same key)
 * 
 * @param context Idempotency context (user, route, key)
 * @param operation Async operation to execute (must return response object)
 * @returns NextResponse (either replayed or fresh)
 */
export async function withIdempotency(
  context: IdempotencyContext,
  operation: () => Promise<IdempotencyResponse>
): Promise<NextResponse> {
  const { userId, route, key } = context;
  
  try {
    // Step 1: Check if key exists
    const existing = await getIdempotencyKey(userId, route, key);
    
    if (existing) {
      // Case A: Request already completed → replay response
      if (existing.status === 'completed') {
        log.info('Idempotency: replaying stored response', {
          userId,
          route,
          key,
          storedStatus: existing.responseStatus,
        });
        
        return NextResponse.json(existing.responseBody, {
          status: existing.responseStatus || 200,
          headers: {
            'X-Idempotency-Replay': 'true',
            'X-Idempotency-Original-Date': existing.completedAt || existing.createdAt,
          },
        });
      }
      
      // Case B: Request in progress → return 409
      if (existing.status === 'in_progress') {
        log.warn('Idempotency: duplicate request while in progress', {
          userId,
          route,
          key,
        });
        
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'REQUEST_IN_PROGRESS',
              message: 'Запрос уже выполняется. Пожалуйста, подождите.',
            },
          },
          { status: 409 }
        );
      }
      
      // Case C: Previous attempt failed → allow retry (continue to step 2)
      log.info('Idempotency: retrying after previous failure', {
        userId,
        route,
        key,
      });
    }
    
    // Step 2: Create in_progress key (prevents concurrent duplicates)
    try {
      await createInProgressKey(userId, route, key);
    } catch (error) {
      // Another request created the key concurrently → treat as duplicate
      if (error instanceof Error && error.message === 'IDEMPOTENCY_KEY_EXISTS') {
        log.warn('Idempotency: race condition detected', { userId, route, key });
        
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'REQUEST_IN_PROGRESS',
              message: 'Запрос уже выполняется. Пожалуйста, подождите.',
            },
          },
          { status: 409 }
        );
      }
      
      throw error;
    }
    
    // Step 3: Execute operation
    log.info('Idempotency: executing operation', { userId, route, key });
    
    let response: IdempotencyResponse;
    try {
      response = await operation();
    } catch (operationError) {
      // Mark key as failed (allows retry)
      await failIdempotencyKey(userId, route, key);
      throw operationError;
    }
    
    // Step 4: Store completed response
    await completeIdempotencyKey(
      userId,
      route,
      key,
      response.status,
      response.body
    );
    
    log.info('Idempotency: operation completed and stored', {
      userId,
      route,
      key,
      status: response.status,
    });
    
    // Return fresh response
    return NextResponse.json(response.body, {
      status: response.status,
      headers: {
        'X-Idempotency-Stored': 'true',
        ...(response.headers || {}),
      },
    });
    
  } catch (error) {
    log.error('Idempotency wrapper error', {
      error,
      userId,
      route,
      key,
    });
    
    throw error;
  }
}

/**
 * Extract Idempotency-Key from request headers
 * 
 * @param request NextRequest
 * @returns Idempotency key or undefined
 */
export function extractIdempotencyKey(request: Request): string | undefined {
  return request.headers.get('Idempotency-Key') || undefined;
}

/**
 * Validate idempotency key format (must be UUID)
 * 
 * @param key Idempotency key
 * @returns True if valid UUID format
 */
export function isValidIdempotencyKey(key: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

