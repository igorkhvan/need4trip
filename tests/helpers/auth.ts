/**
 * Test Authentication Helpers
 * 
 * Purpose: Provide real authentication for integration & E2E tests
 * 
 * NO MOCKS - Uses real JWT creation and user management
 */

import { getAdminDb } from '@/lib/db/client';
import { createAuthToken } from '@/lib/auth/jwt';
import { randomUUID } from 'crypto';
import type { CurrentUser } from '@/lib/auth/currentUser';

/**
 * Create test user in database with valid JWT token
 * 
 * Returns: { user, token, cleanup }
 */
export async function createTestUser(overrides?: {
  name?: string;
  telegram_id?: string;
}): Promise<{ user: CurrentUser; token: string; cleanup: () => Promise<void> }> {
  const db = getAdminDb();
  const userId = randomUUID();
  const telegramId = overrides?.telegram_id ?? `test-${userId}`;
  const name = overrides?.name ?? `Test User ${userId.slice(0, 8)}`;
  
  // Create user in database
  const { error } = await db.from('users').insert({
    id: userId,
    name,
    telegram_id: telegramId,
  });
  
  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
  
  // Create real JWT token
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error('AUTH_JWT_SECRET not configured');
  }
  
  const ttl = 3600; // 1 hour
  const token = await createAuthToken(userId, ttl);
  
  // Return user + token + cleanup function
  const user: CurrentUser = {
    id: userId,
    name,
    telegramId,
    telegramHandle: null,
    avatarUrl: null,
    cityId: null,
    phone: null,
    email: null,
    carBrandId: null,
    carModelText: null,
    experienceLevel: null,
    plan: 'free',
  };
  
  const cleanup = async () => {
    // Cleanup: delete test user (cascade handles related data)
    await db.from('users').delete().eq('id', userId);
  };
  
  return { user, token, cleanup };
}

/**
 * Create Request with x-user-id header (simulates middleware auth)
 * 
 * This is the REAL way API routes receive authenticated requests:
 * Middleware validates JWT and adds x-user-id header.
 * 
 * Usage in tests:
 * ```typescript
 * const req = createAuthenticatedRequest('/api/events', userId);
 * const res = await POST(req, context);
 * ```
 */
export function createAuthenticatedRequest(
  url: string,
  userId: string,
  options?: RequestInit
): Request {
  const headers = new Headers(options?.headers);
  
  // Add x-user-id header (same as middleware does)
  headers.set('x-user-id', userId);
  headers.set('Content-Type', 'application/json');
  
  return new Request(url, {
    method: 'POST',
    ...options,
    headers,
  });
}

/**
 * Get valid city_id from database
 */
export async function getTestCityId(): Promise<string> {
  const db = getAdminDb();
  const { data, error } = await db.from('cities').select('id').limit(1);
  
  if (error || !data || data.length === 0) {
    throw new Error('No cities found in database - seed data missing');
  }
  
  return data[0].id;
}

/**
 * Create test event (helper for E2E tests)
 */
export async function createTestEvent(params: {
  userId: string;
  maxParticipants?: number;
  clubId?: string | null;
  cityId: string;
}): Promise<string> {
  const db = getAdminDb();
  const eventId = randomUUID();
  
  const { error } = await db.from('events').insert({
    id: eventId,
    title: `Test Event ${eventId.slice(0, 8)}`,
    description: 'Auto-generated test event',
    created_by_user_id: params.userId,
    visibility: 'public',
    max_participants: params.maxParticipants ?? 15,
    date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    city_id: params.cityId,
    club_id: params.clubId ?? null,
  });
  
  if (error) {
    throw new Error(`Failed to create test event: ${error.message}`);
  }
  
  return eventId;
}

/**
 * Create test credit (helper for billing tests)
 */
export async function createTestCredit(userId: string): Promise<string> {
  const db = getAdminDb();
  const transactionId = randomUUID();
  const creditId = randomUUID();
  
  // Create transaction
  await db.from('billing_transactions').insert({
    id: transactionId,
    user_id: userId,
    product_code: 'EVENT_UPGRADE_500',
    amount: 1000,
    currency_code: 'KZT',
    status: 'completed',
    provider: 'test',
  });
  
  // Create credit
  await db.from('billing_credits').insert({
    id: creditId,
    user_id: userId,
    credit_code: 'EVENT_UPGRADE_500',
    status: 'available',
    source_transaction_id: transactionId,
  });
  
  return creditId;
}

