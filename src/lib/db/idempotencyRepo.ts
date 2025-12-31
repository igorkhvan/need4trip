/**
 * Idempotency Keys Repository
 * 
 * Purpose: Store and retrieve idempotency keys for duplicate request prevention
 * SSOT: docs/ssot/SSOT_ARCHITECTURE.md § Idempotency Standard
 * 
 * Table: idempotency_keys
 */

import { getAdminDb } from "@/lib/db/client";
import { log } from "@/lib/utils/logger";

// ============================================================================
// Types
// ============================================================================

export interface IdempotencyKey {
  id: string;
  userId: string;
  route: string;
  key: string;
  status: 'in_progress' | 'completed' | 'failed';
  responseStatus?: number;
  responseBody?: any;
  createdAt: string;
  completedAt?: string;
}

interface DbIdempotencyKey {
  id: string;
  user_id: string;
  route: string;
  key: string;
  status: string;
  response_status: number | null;
  response_body: any | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Get existing idempotency key
 * 
 * @param userId User ID
 * @param route HTTP method + path (e.g., "POST /api/events")
 * @param key Idempotency key (UUID)
 * @returns Existing key or null
 */
export async function getIdempotencyKey(
  userId: string,
  route: string,
  key: string
): Promise<IdempotencyKey | null> {
  const db = getAdminDb();
  
  // ⚠️ TODO: Uncomment after migration applied (20241231_add_idempotency_keys.sql)
  // const { data, error } = await db
  //   .from('idempotency_keys')
  //   .select('*')
  //   .eq('user_id', userId)
  //   .eq('route', route)
  //   .eq('key', key)
  //   .maybeSingle();
  
  // if (error) {
  //   log.error('Failed to get idempotency key', { error, userId, route, key });
  //   throw new Error(`Failed to get idempotency key: ${error.message}`);
  // }
  
  // if (!data) return null;
  
  // return mapDbToIdempotencyKey(data as DbIdempotencyKey);
  
  // Temporary stub
  return null;
}

/**
 * Create in-progress idempotency key
 * 
 * @param userId User ID
 * @param route HTTP method + path
 * @param key Idempotency key
 * @returns Created key
 * @throws Error if key already exists
 */
export async function createInProgressKey(
  userId: string,
  route: string,
  key: string
): Promise<IdempotencyKey> {
  const db = getAdminDb();
  
  // ⚠️ TODO: Uncomment after migration applied (20241231_add_idempotency_keys.sql)
  // const { data, error } = await db
  //   .from('idempotency_keys')
  //   .insert({
  //     user_id: userId,
  //     route,
  //     key,
  //     status: 'in_progress',
  //     created_at: new Date().toISOString(),
  //   })
  //   .select('*')
  //   .single();
  
  // if (error) {
  //   // Unique constraint violation (23505) means key already exists
  //   if (error.code === '23505') {
  //     throw new Error('IDEMPOTENCY_KEY_EXISTS');
  //   }
    
  //   log.error('Failed to create idempotency key', { error, userId, route, key });
  //   throw new Error(`Failed to create idempotency key: ${error.message}`);
  // }
  
  // return mapDbToIdempotencyKey(data as DbIdempotencyKey);
  
  // Temporary stub
  return {
    id: crypto.randomUUID(),
    userId,
    route,
    key,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Mark idempotency key as completed with response
 * 
 * @param userId User ID
 * @param route HTTP method + path
 * @param key Idempotency key
 * @param responseStatus HTTP status code
 * @param responseBody Response body (will be stored as JSONB)
 */
export async function completeIdempotencyKey(
  userId: string,
  route: string,
  key: string,
  responseStatus: number,
  responseBody: any
): Promise<void> {
  const db = getAdminDb();
  
  // ⚠️ TODO: Uncomment after migration applied (20241231_add_idempotency_keys.sql)
  // const { error } = await db
  //   .from('idempotency_keys')
  //   .update({
  //     status: 'completed',
  //     response_status: responseStatus,
  //     response_body: responseBody,
  //     completed_at: new Date().toISOString(),
  //   })
  //   .eq('user_id', userId)
  //   .eq('route', route)
  //   .eq('key', key);
  
  // if (error) {
  //   log.error('Failed to complete idempotency key', { error, userId, route, key });
  //   throw new Error(`Failed to complete idempotency key: ${error.message}`);
  // }
  
  // Temporary stub
  log.info('Idempotency key completed (stub)', { userId, route, key, responseStatus });
}

/**
 * Mark idempotency key as failed
 * 
 * @param userId User ID
 * @param route HTTP method + path
 * @param key Idempotency key
 * @param responseStatus HTTP status code (optional)
 * @param responseBody Error response (optional)
 */
export async function failIdempotencyKey(
  userId: string,
  route: string,
  key: string,
  responseStatus?: number,
  responseBody?: any
): Promise<void> {
  const db = getAdminDb();
  
  // ⚠️ TODO: Uncomment after migration applied (20241231_add_idempotency_keys.sql)
  // const { error } = await db
  //   .from('idempotency_keys')
  //   .update({
  //     status: 'failed',
  //     response_status: responseStatus || null,
  //     response_body: responseBody || null,
  //     completed_at: new Date().toISOString(),
  //   })
  //   .eq('user_id', userId)
  //   .eq('route', route)
  //   .eq('key', key);
  
  // if (error) {
  //   log.error('Failed to mark idempotency key as failed', { error, userId, route, key });
  //   // Don't throw — this is cleanup, not critical
  // }
  
  // Temporary stub
  log.info('Idempotency key failed (stub)', { userId, route, key, responseStatus });
}

// ============================================================================
// Mappers
// ============================================================================

function mapDbToIdempotencyKey(db: DbIdempotencyKey): IdempotencyKey {
  return {
    id: db.id,
    userId: db.user_id,
    route: db.route,
    key: db.key,
    status: db.status as 'in_progress' | 'completed' | 'failed',
    responseStatus: db.response_status || undefined,
    responseBody: db.response_body || undefined,
    createdAt: db.created_at,
    completedAt: db.completed_at || undefined,
  };
}

