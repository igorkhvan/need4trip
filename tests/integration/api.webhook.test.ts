/**
 * Integration Tests: Webhook Handler (/api/dev/billing/settle)
 * 
 * Purpose: Test idempotency, security, and settlement logic
 * Scope: QA-23 to QA-29
 * 
 * Note: Tests DEV endpoint as proxy for webhook behavior
 * Uses REAL authentication for end-to-end flow (QA-29)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { getAdminDb } from '@/lib/db/client';
import { createTestUser, createAuthenticatedRequest, getTestCityId } from '../helpers/auth';
import { randomUUID } from 'crypto';

/**
 * Helper: Create mock NextRequest
 */
function createMockRequest(url: string, body: any): any {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any; // Type assertion for test purposes
}

describe('Webhook: POST /api/dev/billing/settle', () => {
  let testUserId: string;
  let transactionId: string;

  beforeEach(async () => {
    const db = getAdminDb();
    
    // Create test user
    testUserId = randomUUID();
    await db.from('users').insert({
      id: testUserId,
      name: 'Test User',
      telegram_id: `test-${testUserId}`,
    });
    
    // Create test transaction (pending)
    transactionId = randomUUID();
    await db.from('billing_transactions').insert({
      id: transactionId,
      user_id: testUserId,
      product_code: 'EVENT_UPGRADE_500',
      amount: 1000,
      currency_code: 'KZT',
      status: 'pending',
      provider: 'kaspi',
    });
  });

  /**
   * QA-23: Idempotency - same transaction settled twice
   */
  test('QA-23: settling same transaction twice is idempotent', async () => {
    const { POST } = await import('@/app/api/dev/billing/settle/route');
    const db = getAdminDb();
    
    // First settlement
    const req1 = createMockRequest(
      'http://localhost:3000/api/dev/billing/settle',
      { transaction_id: transactionId, status: 'completed' }
    );
    
    const res1 = await POST(req1);
    const data1 = await res1.json();
    
    expect(res1.status).toBe(200);
    expect(data1.data.status).toBe('completed');
    
    // Verify: transaction updated
    const { data: tx1 } = await db
      .from('billing_transactions')
      .select('status')
      .eq('id', transactionId)
      .single();
    
    expect(tx1?.status).toBe('completed');
    
    // Verify: credit created
    const { data: credits1 } = await db
      .from('billing_credits')
      .select('id')
      .eq('source_transaction_id', transactionId);
    
    expect(credits1?.length).toBe(1);
    const firstCreditId = credits1?.[0].id;
    
    // Second settlement (duplicate webhook)
    const req2 = createMockRequest(
      'http://localhost:3000/api/dev/billing/settle',
      { transaction_id: transactionId, status: 'completed' }
    );
    
    const res2 = await POST(req2);
    const data2 = await res2.json();
    
    expect(res2.status).toBe(200); // Still succeeds (idempotent)
    
    // Verify: still only ONE credit (UNIQUE constraint enforced)
    const { data: credits2 } = await db
      .from('billing_credits')
      .select('id')
      .eq('source_transaction_id', transactionId);
    
    expect(credits2?.length).toBe(1);
    expect(credits2?.[0].id).toBe(firstCreditId); // Same credit
  });

  /**
   * QA-24: Invalid transaction_id → 404
   */
  test('QA-24: unknown transaction_id returns 404', async () => {
    const { POST } = await import('@/app/api/dev/billing/settle/route');
    
    const fakeId = randomUUID();
    const req = createMockRequest(
      'http://localhost:3000/api/dev/billing/settle',
      { transaction_id: fakeId, status: 'completed' }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(404);
    expect(data.error.code).toBe('TRANSACTION_NOT_FOUND');
    
    // Verify: no credit created
    const db = getAdminDb();
    const { data: credits } = await db
      .from('billing_credits')
      .select('id')
      .eq('source_transaction_id', fakeId);
    
    expect(credits?.length).toBe(0);
  });

  /**
   * QA-25: Invalid payload → 400
   */
  test('QA-25: invalid payload returns 400', async () => {
    const { POST } = await import('@/app/api/dev/billing/settle/route');
    
    // Missing transaction_id
    const req1 = createMockRequest(
      'http://localhost:3000/api/dev/billing/settle',
      { status: 'completed' }
    );
    
    const res1 = await POST(req1);
    const data1 = await res1.json();
    
    expect(res1.status).toBe(400);
    expect(data1.error.code).toBe('INVALID_INPUT');
    
    // Invalid status value
    const req2 = createMockRequest(
      'http://localhost:3000/api/dev/billing/settle',
      { transaction_id: transactionId, status: 'invalid_status' }
    );
    
    const res2 = await POST(req2);
    const data2 = await res2.json();
    
    expect(res2.status).toBe(400);
    expect(data2.error.code).toBe('INVALID_INPUT');
  });

  /**
   * QA-26: Failed settlement does NOT create credit
   */
  test('QA-26: failed status does not create credit', async () => {
    const { POST } = await import('@/app/api/dev/billing/settle/route');
    const db = getAdminDb();
    
    const req = createMockRequest(
      'http://localhost:3000/api/dev/billing/settle',
      { transaction_id: transactionId, status: 'failed' }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.data.status).toBe('failed');
    
    // Verify: transaction marked failed
    const { data: tx } = await db
      .from('billing_transactions')
      .select('status')
      .eq('id', transactionId)
      .single();
    
    expect(tx?.status).toBe('failed');
    
    // Verify: NO credit created
    const { data: credits } = await db
      .from('billing_credits')
      .select('id')
      .eq('source_transaction_id', transactionId);
    
    expect(credits?.length).toBe(0);
  });

  /**
   * QA-27: Out-of-order events (completed without pending transaction)
   */
  test('QA-27: settling non-existent transaction returns 404', async () => {
    const { POST } = await import('@/app/api/dev/billing/settle/route');
    
    // Transaction never created (simulate webhook arriving before purchase-intent completes)
    const orphanId = randomUUID();
    
    const req = createMockRequest(
      'http://localhost:3000/api/dev/billing/settle',
      { transaction_id: orphanId, status: 'completed' }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    // Strategy: Strict reject (404)
    expect(res.status).toBe(404);
    expect(data.error.code).toBe('TRANSACTION_NOT_FOUND');
    
    // Alternative strategy (self-healing): Would create transaction, then credit
    // NOT implemented - choose one strategy and document
  });

  /**
   * QA-28: Concurrent webhook deliveries (same provider_payment_id)
   */
  test('QA-28: concurrent settlement of same transaction', async () => {
    const { POST } = await import('@/app/api/dev/billing/settle/route');
    
    // Simulate two concurrent webhook deliveries
    const promises = [
      (async () => {
        const req = createMockRequest(
          'http://localhost:3000/api/dev/billing/settle',
          { transaction_id: transactionId, status: 'completed' }
        );
        return await POST(req);
      })(),
      (async () => {
        const req = createMockRequest(
          'http://localhost:3000/api/dev/billing/settle',
          { transaction_id: transactionId, status: 'completed' }
        );
        return await POST(req);
      })(),
    ];
    
    const results = await Promise.allSettled(promises);
    
    // Both should succeed (idempotent)
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBe(2);
    
    // Verify: only ONE credit created
    const db = getAdminDb();
    const { data: credits } = await db
      .from('billing_credits')
      .select('id')
      .eq('source_transaction_id', transactionId);
    
    expect(credits?.length).toBe(1); // UNIQUE constraint protection
  });
});

/**
 * Integration with credit consumption
 */
describe('Webhook → Credit → Publish flow (end-to-end)', () => {
  let testUserId: string;
  let testToken: string;
  let testEventId: string;
  let transactionId: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const db = getAdminDb();
    
    // Create real test user with JWT token
    const testUser = await createTestUser();
    testUserId = testUser.user.id;
    testToken = testUser.token;
    cleanup = testUser.cleanup;
    
    // Get valid city_id
    const cityId = await getTestCityId();
    
    // Create event
    testEventId = randomUUID();
    await db.from('events').insert({
      id: testEventId,
      title: 'Test Event',
      description: 'Test',
      created_by_user_id: testUserId,
      visibility: 'public',
      max_participants: 100,
      date_time: new Date().toISOString(),
      city_id: cityId,
    });
    
    // Create transaction
    transactionId = randomUUID();
    await db.from('billing_transactions').insert({
      id: transactionId,
      user_id: testUserId,
      product_code: 'EVENT_UPGRADE_500',
      amount: 1000,
      currency_code: 'KZT',
      status: 'pending',
      provider: 'kaspi',
    });
  });
  
  afterEach(async () => {
    await cleanup();
  });

  /**
   * QA-29: Full flow: purchase → settle → publish
   */
  test('QA-29: webhook settlement enables event publish', async () => {
    const db = getAdminDb();
    
    // Step 1: User purchased (transaction pending)
    const { data: tx1 } = await db
      .from('billing_transactions')
      .select('status')
      .eq('id', transactionId)
      .single();
    
    expect(tx1?.status).toBe('pending');
    
    // Step 2: Webhook arrives → settle
    const { POST: settle } = await import('@/app/api/dev/billing/settle/route');
    const settleReq = new Request('http://localhost:3000/api/dev/billing/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: transactionId, status: 'completed' }),
    }) as any; // Type assertion for test purposes
    
    const settleRes = await settle(settleReq);
    expect(settleRes.status).toBe(200);
    
    // Verify: credit issued
    const { data: credits } = await db
      .from('billing_credits')
      .select('*')
      .eq('user_id', testUserId)
      .eq('status', 'available');
    
    expect(credits?.length).toBe(1);
    expect(credits?.[0].credit_code).toBe('EVENT_UPGRADE_500');
    
    // Step 3: User publishes event with credit
    const { POST: publish } = await import('@/app/api/events/[id]/publish/route');
    
    // First attempt (no confirm) - use real authentication
    let publishReq = createAuthenticatedRequest(
      `http://localhost:3000/api/events/${testEventId}/publish`,
      testUserId
    );
    
    let publishRes = await publish(publishReq, { params: Promise.resolve({ id: testEventId }) });
    let publishData = await publishRes.json();
    
    // Expect 409 (credit confirmation required)
    expect(publishRes.status).toBe(409);
    expect(publishData.error.code).toBe('CREDIT_CONFIRMATION_REQUIRED');
    
    // Confirm - use real authentication
    publishReq = createAuthenticatedRequest(
      `http://localhost:3000/api/events/${testEventId}/publish?confirm_credit=1`,
      testUserId
    );
    
    publishRes = await publish(publishReq, { params: Promise.resolve({ id: testEventId }) });
    publishData = await publishRes.json();
    
    // Expect 200 (published)
    expect(publishRes.status).toBe(200);
    expect(publishData.data.creditConsumed).toBe(true);
    
    // Verify: credit consumed
    const { data: consumedCredits } = await db
      .from('billing_credits')
      .select('*')
      .eq('user_id', testUserId)
      .eq('status', 'consumed');
    
    expect(consumedCredits?.length).toBe(1);
    expect(consumedCredits?.[0].consumed_event_id).toBe(testEventId);
    
    // Verify: event published
    const { data: event } = await db
      .from('events')
      .select('published_at')
      .eq('id', testEventId)
      .single();
    
    expect(event?.published_at).not.toBeNull();
  });
});

