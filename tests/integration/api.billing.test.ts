/**
 * Integration Tests: Billing API Routes
 * 
 * Purpose: Test HTTP contracts for billing endpoints
 * Scope: QA-14 to QA-22
 * 
 * Uses REAL authentication via x-user-id header (simulates middleware)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { getAdminDb } from '@/lib/db/client';
import { createTestUser, createAuthenticatedRequest } from '../helpers/auth';
import { randomUUID } from 'crypto';

describe('API: POST /api/billing/purchase-intent', () => {
  let testUserId: string;
  let testToken: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    // Create real test user with JWT token
    const testUser = await createTestUser();
    testUserId = testUser.user.id;
    testToken = testUser.token;
    cleanup = testUser.cleanup;
  });
  
  afterEach(async () => {
    // Cleanup test data
    await cleanup();
  });

  /**
   * QA-14: Valid product → transaction + invoice_url
   */
  test('QA-14: valid EVENT_UPGRADE_500 returns transaction + payment details', async () => {
    const { POST } = await import('@/app/api/billing/purchase-intent/route');
    
    const req = createAuthenticatedRequest(
      'http://localhost:3000/api/billing/purchase-intent',
      testUserId,
      { 
        body: JSON.stringify({ product_code: 'EVENT_UPGRADE_500', quantity: 1 })
      }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    // Then: 200 with transaction details
    expect(res.status).toBe(200);
    expect(data.data.transaction_id).toBeDefined();
    expect(data.data.transaction_reference).toBeDefined();
    expect(data.data.payment.provider).toBe('kaspi');
    expect(data.data.payment.invoice_url).toContain('kaspi.kz/pay');
    
    // Verify: transaction created in DB with status=pending
    const db = getAdminDb();
    const { data: tx } = await db
      .from('billing_transactions')
      .select('*')
      .eq('id', data.data.transaction_id)
      .single();
    
    expect(tx).toBeDefined();
    expect(tx?.status).toBe('pending');
    expect(tx?.product_code).toBe('EVENT_UPGRADE_500');
    expect(Number(tx?.amount)).toBe(1000); // From billing_products
    expect(tx?.currency_code).toBe('KZT');
  });

  /**
   * QA-15: Invalid product → 400
   */
  test('QA-15: invalid product_code returns 400', async () => {
    const { POST } = await import('@/app/api/billing/purchase-intent/route');
    
    const req = createAuthenticatedRequest(
      'http://localhost:3000/api/billing/purchase-intent',
      testUserId,
      { 
        body: JSON.stringify({ product_code: 'INVALID_PRODUCT', quantity: 1 })
      }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.error.code).toBe('INVALID_PRODUCT_CODE');
    
    // Verify: no transaction created
    const db = getAdminDb();
    const { data: txs } = await db
      .from('billing_transactions')
      .select('id')
      .eq('user_id', testUserId);
    
    expect(txs?.length).toBe(0);
  });

  /**
   * QA-16: Unauthenticated → 401
   */
  test('QA-16: unauthenticated request returns 401', async () => {
    const { POST } = await import('@/app/api/billing/purchase-intent/route');
    
    const req = new Request(
      'http://localhost:3000/api/billing/purchase-intent',
      { 
        method: 'POST',
        body: JSON.stringify({ product_code: 'EVENT_UPGRADE_500' })
      }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  /**
   * QA-17: Club product (CLUB_50) creates correct transaction
   * 
   * TODO: Enable when club subscriptions fully implemented
   */
  test.skip('QA-17: CLUB_50 product creates transaction with plan_id', async () => {
    const { POST } = await import('@/app/api/billing/purchase-intent/route');
    
    const req = createAuthenticatedRequest(
      'http://localhost:3000/api/billing/purchase-intent',
      testUserId,
      { 
        body: JSON.stringify({ product_code: 'CLUB_50', quantity: 1 })
      }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    // Debug: log response if test fails
    if (res.status !== 200) {
      console.error('QA-17 Failed:', { status: res.status, data });
    }
    
    expect(res.status).toBe(200);
    
    // Verify: transaction has plan_id set
    const db = getAdminDb();
    const { data: tx } = await db
      .from('billing_transactions')
      .select('*')
      .eq('id', data.data.transaction_id)
      .single();
    
    expect(tx?.plan_id).toBe('club_50');
    expect(Number(tx?.amount)).toBe(5000); // From club_plans
  });
});

describe('API: GET /api/billing/transactions/status', () => {
  let testUserId: string;
  let transactionId: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const db = getAdminDb();
    
    // Create real test user
    const testUser = await createTestUser();
    testUserId = testUser.user.id;
    cleanup = testUser.cleanup;
    
    // Create test transaction
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
   * QA-18: Valid transaction_id returns status
   */
  test('QA-18: valid transaction_id returns current status', async () => {
    const { GET } = await import('@/app/api/billing/transactions/status/route');
    
    const req = createAuthenticatedRequest(
      `http://localhost:3000/api/billing/transactions/status?transaction_id=${transactionId}`,
      testUserId,
      { method: 'GET' }
    );
    
    const res = await GET(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.data.transaction_id).toBe(transactionId);
    expect(data.data.status).toBe('pending');
    expect(data.data.product_code).toBe('EVENT_UPGRADE_500');
    expect(data.data.amount).toBe(1000);
    expect(data.data.currency_code).toBe('KZT');
  });

  /**
   * QA-19: Status transition (pending → completed)
   */
  test('QA-19: status transition from pending to completed', async () => {
    const db = getAdminDb();
    const { GET } = await import('@/app/api/billing/transactions/status/route');
    
    // Given: transaction is pending
    let req = createAuthenticatedRequest(
      `http://localhost:3000/api/billing/transactions/status?transaction_id=${transactionId}`,
      testUserId,
      { method: 'GET' }
    );
    let res = await GET(req);
    let data = await res.json();
    
    expect(data.data.status).toBe('pending');
    
    // When: transaction is marked completed (simulate webhook)
    await db
      .from('billing_transactions')
      .update({ status: 'completed' })
      .eq('id', transactionId);
    
    // Then: status endpoint returns completed
    req = createAuthenticatedRequest(
      `http://localhost:3000/api/billing/transactions/status?transaction_id=${transactionId}`,
      testUserId,
      { method: 'GET' }
    );
    res = await GET(req);
    data = await res.json();
    
    expect(data.data.status).toBe('completed');
  });

  /**
   * QA-20: Missing parameter → 400
   */
  test('QA-20: missing transaction_id returns 400', async () => {
    const { GET } = await import('@/app/api/billing/transactions/status/route');
    
    const req = createAuthenticatedRequest(
      'http://localhost:3000/api/billing/transactions/status',
      testUserId,
      { method: 'GET' }
    );
    
    const res = await GET(req);
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.error.code).toBe('MISSING_PARAMETER');
  });

  /**
   * QA-21: Unknown transaction → 404
   */
  test('QA-21: unknown transaction_id returns 404', async () => {
    const { GET } = await import('@/app/api/billing/transactions/status/route');
    
    const req = createAuthenticatedRequest(
      `http://localhost:3000/api/billing/transactions/status?transaction_id=${randomUUID()}`,
      testUserId,
      { method: 'GET' }
    );
    
    const res = await GET(req);
    const data = await res.json();
    
    expect(res.status).toBe(404);
    expect(data.error.code).toBe('TRANSACTION_NOT_FOUND');
  });

  /**
   * QA-22: Idempotent polling
   */
  test('QA-22: repeated status queries are idempotent', async () => {
    const { GET } = await import('@/app/api/billing/transactions/status/route');
    
    const results: string[] = [];
    
    // Poll 5 times
    for (let i = 0; i < 5; i++) {
      const req = createAuthenticatedRequest(
        `http://localhost:3000/api/billing/transactions/status?transaction_id=${transactionId}`,
        testUserId,
        { method: 'GET' }
      );
      const res = await GET(req);
      const data = await res.json();
      results.push(data.data.status);
    }
    
    // All should return same status
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe('pending');
  });
});
