/**
 * Integration Tests: Webhook Handler (/api/dev/billing/settle)
 * 
 * Purpose: Test idempotency, security, and settlement logic
 * Scope: QA-23 to QA-29
 * 
 * Note: Tests DEV endpoint as proxy for webhook behavior
 * 
 * SSOT: docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md §7 (Event Save Enforcement v5)
 * NOTE: v5 has NO separate publish endpoint. Events are saved directly.
 * Credit consumption happens during event create/update with confirm_credit=1
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/db/client';
import { createTestUser, getTestCityId } from '../helpers/auth';
import { enforceEventPublish } from '@/lib/services/accessControl';
import { consumeCredit } from '@/lib/db/billingCreditsRepo';
import { randomUUID } from 'crypto';

/**
 * Helper: Create mock NextRequest
 */
function createMockRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
 * Integration with credit consumption (v5 - save-time enforcement)
 * 
 * SSOT: v5 has NO separate publish endpoint.
 * Instead, enforceEventPublish is called during event save (create/update).
 * Credit consumption happens with confirm_credit=1 query param.
 */
describe('Webhook → Credit → Event Save flow (end-to-end, v5)', () => {
  let testUserId: string;
  let testEventId: string;
  let transactionId: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const db = getAdminDb();
    
    // Create real test user with JWT token
    const testUser = await createTestUser();
    testUserId = testUser.user.id;
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
      max_participants: 100, // Exceeds free (15)
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
   * QA-29: Full flow: purchase → settle → event save with credit
   * 
   * v5 changes:
   * - No separate /publish endpoint
   * - enforceEventPublish called during event save
   * - Credit consumed atomically with event save
   */
  test('QA-29: webhook settlement enables event save with credit', async () => {
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
    const settleReq = createMockRequest(
      'http://localhost:3000/api/dev/billing/settle',
      { transaction_id: transactionId, status: 'completed' }
    );
    
    const settleRes = await settle(settleReq);
    expect(settleRes.status).toBe(200);
    
    // Verify: credit issued
    const { data: credits } = await db
      .from('billing_credits')
      .select('id, status, credit_code')
      .eq('user_id', testUserId)
      .eq('status', 'available');
    
    expect(credits?.length).toBe(1);
    expect(credits?.[0].credit_code).toBe('EVENT_UPGRADE_500');
    
    // Step 3: enforceEventPublish with confirm_credit=true (simulating event save)
    // This is how v5 works - enforcement is called during createEvent/updateEvent
    
    // First: without confirmation (should succeed because credit available)
    // But wait for CreditConfirmationRequiredError (409)
    await expect(
      enforceEventPublish({
        eventId: testEventId,
        userId: testUserId,
        maxParticipants: 100, // Exceeds free, needs credit
        clubId: null,
        isPaid: false,
      }, false) // No confirm
    ).rejects.toThrow(); // CreditConfirmationRequiredError
    
    // Then: with confirmation (should succeed)
    await expect(
      enforceEventPublish({
        eventId: testEventId,
        userId: testUserId,
        maxParticipants: 100,
        clubId: null,
        isPaid: false,
      }, true) // confirm_credit=1
    ).resolves.toEqual({ requiresCredit: true }); // Credit will be consumed
    
    // Actually consume the credit (this is what event service does atomically)
    await consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);
    
    // Verify: credit consumed
    const { data: consumedCredits } = await db
      .from('billing_credits')
      .select('id, status, consumed_event_id')
      .eq('user_id', testUserId)
      .eq('status', 'consumed');
    
    expect(consumedCredits?.length).toBe(1);
    expect(consumedCredits?.[0].consumed_event_id).toBe(testEventId);
    
    // Note: v5 has no published_at field
    // Event is "live" when it exists and passes visibility rules
    const { data: event } = await db
      .from('events')
      .select('id, max_participants')
      .eq('id', testEventId)
      .single();
    
    expect(event).toBeDefined();
    expect(event?.max_participants).toBe(100);
  });
});
