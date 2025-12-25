/**
 * Integration Tests: POST /api/events/:id/publish API Route
 * 
 * Purpose: Test HTTP contracts, auth, idempotency of publish endpoint
 * Scope: QA-9 to QA-13
 * 
 * Uses REAL authentication via x-user-id header (simulates middleware)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { getAdminDb } from '@/lib/db/client';
import { createBillingCredit } from '@/lib/db/billingCreditsRepo';
import { createTestUser, createAuthenticatedRequest, getTestCityId } from '../helpers/auth';
import { randomUUID } from 'crypto';

/**
 * Helper: Create test credit
 */
async function createTestCredit(userId: string) {
  const db = getAdminDb();
  const transactionId = randomUUID();
  
  const { error: txError } = await db.from('billing_transactions').insert({
    id: transactionId,
    user_id: userId,
    product_code: 'EVENT_UPGRADE_500',
    amount: 1000,
    currency_code: 'KZT',
    status: 'completed',
    provider: 'test',
  });
  
  if (txError) {
    throw new Error(`Failed to create test transaction: ${txError.message}`);
  }
  
  return await createBillingCredit({
    userId,
    creditCode: 'EVENT_UPGRADE_500',
    sourceTransactionId: transactionId,
  });
}

describe('API: POST /api/events/:id/publish', () => {
  let testUserId: string;
  let testToken: string;
  let testEventId: string;
  let cityId: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    // Create real test user with JWT token
    const testUser = await createTestUser();
    testUserId = testUser.user.id;
    testToken = testUser.token;
    cleanup = testUser.cleanup;
    
    // Get valid city
    cityId = await getTestCityId();
    
    // Create test event
    testEventId = randomUUID();
    const db = getAdminDb();
    const { error: eventError } = await db
      .from('events')
      .insert({
        id: testEventId,
        title: 'Test Event',
        description: 'Test Description',
        created_by_user_id: testUserId,
        visibility: 'public',
        max_participants: 100, // Exceeds free (15)
        date_time: new Date().toISOString(),
        city_id: cityId,
      });
    
    if (eventError) {
      throw new Error(`Failed to create test event: ${eventError.message}`);
    }
  });
  
  afterEach(async () => {
    // Cleanup test data
    await cleanup();
  });

  /**
   * QA-9: Auth enforcement
   */
  test('QA-9: unauthenticated request returns 401', async () => {
    const { POST } = await import('@/app/api/events/[id]/publish/route');
    
    // Create request WITHOUT auth token
    const req = new Request(
      `http://localhost:3000/api/events/${testEventId}/publish`,
      { method: 'POST' }
    );
    
    const res = await POST(req, { params: Promise.resolve({ id: testEventId }) });
    const data = await res.json();
    
    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
    
    // Verify: no DB side effects
    const db = getAdminDb();
    const { data: event } = await db
      .from('events')
      .select('published_at')
      .eq('id', testEventId)
      .single();
    
    expect(event?.published_at).toBeNull(); // Not published
  });

  /**
   * QA-10: Authorization check (only owner can publish)
   */
  test('QA-10: non-owner cannot publish event (403)', async () => {
    const { POST } = await import('@/app/api/events/[id]/publish/route');
    
    // Create another user (not owner)
    const otherUser = await createTestUser();
    
    const req = createAuthenticatedRequest(
      `http://localhost:3000/api/events/${testEventId}/publish`,
      otherUser.user.id // Different user
    );
    
    const res = await POST(req, { params: Promise.resolve({ id: testEventId }) });
    const data = await res.json();
    
    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
    
    // Cleanup other user
    await otherUser.cleanup();
  });

  /**
   * QA-11: Idempotency - already published event
   */
  test('QA-11: idempotency - already published returns 200 without re-consuming credit', async () => {
    const db = getAdminDb();
    
    // Given: event already published
    await db
      .from('events')
      .update({ published_at: new Date().toISOString() })
      .eq('id', testEventId);
    
    // And: user has available credit
    await createTestCredit(testUserId);
    
    const { POST } = await import('@/app/api/events/[id]/publish/route');
    const req = createAuthenticatedRequest(
      `http://localhost:3000/api/events/${testEventId}/publish`,
      testUserId
    );
    
    const res = await POST(req, { params: Promise.resolve({ id: testEventId }) });
    const data = await res.json();
    
    // Then: returns 200 with alreadyPublished flag
    expect(res.status).toBe(200);
    expect(data.data.alreadyPublished).toBe(true);
    
    // Verify: credit still available (not consumed)
    const { data: credits } = await db
      .from('billing_credits')
      .select('status')
      .eq('user_id', testUserId);
    
    const available = credits?.filter(c => c.status === 'available');
    expect(available?.length).toBe(1);
  });

  /**
   * QA-12: 402 Paywall contract
   */
  test('QA-12: paywall (no credit) returns 402 with correct options', async () => {
    const { POST } = await import('@/app/api/events/[id]/publish/route');
    
    // Given: user has NO credit
    const req = createAuthenticatedRequest(
      `http://localhost:3000/api/events/${testEventId}/publish`,
      testUserId
    );
    
    const res = await POST(req, { params: Promise.resolve({ id: testEventId }) });
    const data = await res.json();
    
    // Debug: log response if test fails
    if (res.status !== 402) {
      console.error('Unexpected response:', { status: res.status, data });
    }
    
    // Then: 402 with PaywallError
    expect(res.status).toBe(402);
    expect(data.code).toBe('PAYWALL'); // PaywallError.toJSON() returns flat structure
    expect(data.reason).toBe('PUBLISH_REQUIRES_PAYMENT');
    
    // Verify: options contain ONE_OFF_CREDIT with price from DB (no hardcode)
    const oneOffOption = data.options?.find((o: any) => o.type === 'ONE_OFF_CREDIT');
    expect(oneOffOption).toBeDefined();
    expect(oneOffOption.price).toBe(1000); // From billing_products
    expect(oneOffOption.currencyCode).toBe('KZT');
    expect(oneOffOption.productCode).toBe('EVENT_UPGRADE_500');
    
    // Verify: options contain CLUB_ACCESS
    const clubOption = data.options?.find((o: any) => o.type === 'CLUB_ACCESS');
    expect(clubOption).toBeDefined();
  });

  /**
   * QA-13: 409 Credit confirmation flow
   */
  test('QA-13: credit confirmation flow (409 → confirm → 200)', async () => {
    const db = getAdminDb();
    
    // Given: user has available credit
    await createTestCredit(testUserId);
    
    const { POST } = await import('@/app/api/events/[id]/publish/route');
    
    // Step 1: First request without confirmation
    const req1 = createAuthenticatedRequest(
      `http://localhost:3000/api/events/${testEventId}/publish`,
      testUserId
    );
    
    const res1 = await POST(req1, { params: Promise.resolve({ id: testEventId }) });
    const data1 = await res1.json();
    
    // Then: 409 CREDIT_CONFIRMATION_REQUIRED
    expect(res1.status).toBe(409);
    expect(data1.error.code).toBe('CREDIT_CONFIRMATION_REQUIRED');
    expect(data1.error.reason).toBe('EVENT_UPGRADE_WILL_BE_CONSUMED');
    expect(data1.error.meta.creditCode).toBe('EVENT_UPGRADE_500');
    expect(data1.error.meta.eventId).toBe(testEventId);
    expect(data1.error.cta.href).toContain('confirm_credit=1');
    
    // Step 2: Second request with confirm_credit=1
    const req2 = createAuthenticatedRequest(
      `http://localhost:3000/api/events/${testEventId}/publish?confirm_credit=1`,
      testUserId
    );
    
    const res2 = await POST(req2, { params: Promise.resolve({ id: testEventId }) });
    const data2 = await res2.json();
    
    // Then: 200 with creditConsumed flag
    expect(res2.status).toBe(200);
    expect(data2.data.creditConsumed).toBe(true);
    expect(data2.data.publishedAt).toBeDefined();
    
    // Verify: exactly one credit consumed
    const { data: credits } = await db
      .from('billing_credits')
      .select('status, consumed_event_id')
      .eq('user_id', testUserId);
    
    const consumed = credits?.filter(c => c.status === 'consumed');
    expect(consumed?.length).toBe(1);
    expect(consumed?.[0].consumed_event_id).toBe(testEventId);
    
    // Verify: event is published
    const { data: event } = await db
      .from('events')
      .select('published_at')
      .eq('id', testEventId)
      .single();
    
    expect(event?.published_at).not.toBeNull();
  });
});

