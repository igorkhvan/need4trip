/**
 * Integration Tests: Credit Consumption (SSOT-compliant)
 * 
 * Purpose: Test that credit consumption follows SSOT constraints:
 * 1. Credit can only be consumed with a valid eventId (constraint chk_billing_credits_consumed_state)
 * 2. Error semantics are correct (409 for confirmation required, 402 for paywall)
 * 3. Idempotency works correctly
 * 
 * SSOT References:
 * - SSOT_DATABASE.md §8.1 (chk_billing_credits_consumed_state)
 * - SSOT_CLUBS_EVENTS_ACCESS.md §10.1.2 (consumption requires persisted eventId)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { getAdminDb } from '@/lib/db/client';
import { createBillingCredit, consumeCredit, hasAvailableCredit, getAvailableCredits } from '@/lib/db/billingCreditsRepo';
import { executeWithCreditTransaction } from '@/lib/services/creditTransaction';
import { enforceEventPublish } from '@/lib/services/accessControl';
import { CreditConfirmationRequiredError } from '@/lib/errors';
import { PaywallError } from '@/lib/errors';
import { randomUUID } from 'crypto';

/**
 * Helper: Create test user
 */
async function createTestUser(): Promise<string> {
  const db = getAdminDb();
  const userId = randomUUID();
  
  const { error } = await db.from('users').insert({
    id: userId,
    name: 'Test User',
    telegram_id: `test-${userId}`,
  });
  
  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  return userId;
}

/**
 * Helper: Create test event
 */
async function createTestEvent(userId: string, maxParticipants: number = 100): Promise<string> {
  const db = getAdminDb();
  const eventId = randomUUID();
  
  // Get a valid city_id
  const { data: cities } = await db.from('cities').select('id').limit(1);
  const cityId = cities?.[0]?.id;
  if (!cityId) throw new Error('No cities found in database');
  
  const { error } = await db.from('events').insert({
    id: eventId,
    title: 'Test Event',
    description: 'Test Description',
    created_by_user_id: userId,
    visibility: 'public',
    max_participants: maxParticipants,
    date_time: new Date().toISOString(),
    city_id: cityId,
  });
  
  if (error) throw new Error(`Failed to create test event: ${error.message}`);
  return eventId;
}

/**
 * Helper: Create test credit
 */
async function createTestCredit(userId: string): Promise<string> {
  const db = getAdminDb();
  const transactionId = randomUUID();
  
  await db.from('billing_transactions').insert({
    id: transactionId,
    user_id: userId,
    product_code: 'EVENT_UPGRADE_500',
    amount: 1000,
    currency_code: 'KZT',
    status: 'completed',
    provider: 'test',
  });
  
  const credit = await createBillingCredit({
    userId,
    creditCode: 'EVENT_UPGRADE_500',
    sourceTransactionId: transactionId,
  });
  
  return credit.id;
}

/**
 * Helper: Cleanup test data
 */
async function cleanup(userId: string, eventId?: string) {
  const db = getAdminDb();
  
  if (eventId) {
    await db.from('events').delete().eq('id', eventId);
  }
  
  await db.from('billing_credits').delete().eq('user_id', userId);
  await db.from('billing_transactions').delete().eq('user_id', userId);
  await db.from('users').delete().eq('id', userId);
}

describe('Credit Consumption: SSOT Compliance', () => {
  let testUserId: string;
  let testEventId: string;
  
  beforeEach(async () => {
    testUserId = await createTestUser();
  });
  
  afterEach(async () => {
    await cleanup(testUserId, testEventId);
  });

  /**
   * QA-CC-1: consumeCredit MUST have valid eventId
   * 
   * SSOT: "Consuming a credit for a 'future' or 'hypothetical' event is FORBIDDEN"
   */
  test('consumeCredit requires valid eventId (not null)', async () => {
    // Given: user has available credit
    await createTestCredit(testUserId);
    
    // When: try to consume with null eventId
    // @ts-expect-error - Testing runtime validation
    const consumePromise = consumeCredit(testUserId, 'EVENT_UPGRADE_500', null);
    
    // Then: should throw SSOT violation error
    await expect(consumePromise).rejects.toThrow('SSOT violation');
  });

  /**
   * QA-CC-2: consumeCredit with valid eventId succeeds
   * 
   * This tests the constraint: (status = 'consumed' AND consumed_event_id IS NOT NULL AND consumed_at IS NOT NULL)
   */
  test('consumeCredit with valid eventId satisfies constraint', async () => {
    // Given: user has available credit and event exists
    const creditId = await createTestCredit(testUserId);
    testEventId = await createTestEvent(testUserId);
    
    // When: consume with valid eventId
    const consumed = await consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);
    
    // Then: credit is consumed with all required fields
    expect(consumed.status).toBe('consumed');
    expect(consumed.consumedEventId).toBe(testEventId);
    expect(consumed.consumedAt).not.toBeNull();
  });

  /**
   * QA-CC-3: No credit available returns 402 PaywallError
   * 
   * SSOT: Expected paywall outcomes must return 402, not 500
   */
  test('consumeCredit without available credit returns PaywallError (402)', async () => {
    // Given: user has NO available credit, but event exists
    testEventId = await createTestEvent(testUserId);
    
    // When: try to consume
    const consumePromise = consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);
    
    // Then: PaywallError (402), not generic Error (500)
    await expect(consumePromise).rejects.toBeInstanceOf(PaywallError);
    await expect(consumePromise).rejects.toMatchObject({
      code: 'PAYWALL',
      reason: 'NO_CREDIT_AVAILABLE',
    });
  });
});

describe('Credit Transaction: Compensating Pattern', () => {
  let testUserId: string;
  let testEventId: string;
  
  beforeEach(async () => {
    testUserId = await createTestUser();
  });
  
  afterEach(async () => {
    await cleanup(testUserId, testEventId);
  });

  /**
   * QA-CT-1: executeWithCreditTransaction creates event first, then consumes credit
   */
  test('event is created before credit consumption', async () => {
    // Given: user has credit
    await createTestCredit(testUserId);
    
    let eventCreatedFirst = false;
    let eventIdAtConsumption: string | undefined;
    
    // When: execute with credit transaction
    const result = await executeWithCreditTransaction(
      testUserId,
      'EVENT_UPGRADE_500',
      undefined, // new event
      async () => {
        // This is the operation (event creation simulation)
        testEventId = await createTestEvent(testUserId);
        eventCreatedFirst = true;
        return { id: testEventId };
      }
    );
    
    // Then: event was created first
    expect(eventCreatedFirst).toBe(true);
    expect(result.id).toBe(testEventId);
    
    // Verify credit was consumed with correct eventId
    const db = getAdminDb();
    const { data: credits } = await db
      .from('billing_credits')
      .select('*')
      .eq('user_id', testUserId)
      .eq('status', 'consumed');
    
    expect(credits?.length).toBe(1);
    expect(credits?.[0].consumed_event_id).toBe(testEventId);
  });

  /**
   * QA-CT-2: If credit consumption fails, event is rolled back (deleted)
   */
  test('event is deleted if credit consumption fails', async () => {
    // Given: user has NO credit
    let createdEventId: string | undefined;
    
    // When: try to execute with credit transaction (will fail at consumption step)
    const transactionPromise = executeWithCreditTransaction(
      testUserId,
      'EVENT_UPGRADE_500',
      undefined,
      async () => {
        // Event creation succeeds
        createdEventId = await createTestEvent(testUserId);
        testEventId = createdEventId; // for cleanup
        return { id: createdEventId };
      }
    );
    
    // Then: transaction fails with PaywallError
    await expect(transactionPromise).rejects.toBeInstanceOf(PaywallError);
    
    // Verify: event was deleted (rolled back)
    const db = getAdminDb();
    const { data: event } = await db
      .from('events')
      .select('id')
      .eq('id', createdEventId!)
      .maybeSingle();
    
    expect(event).toBeNull(); // Event should be deleted
  });

  /**
   * QA-CT-3: Successful transaction leaves credit consumed and event exists
   */
  test('successful transaction: credit consumed, event persisted', async () => {
    // Given: user has credit
    await createTestCredit(testUserId);
    
    // When: execute with credit transaction
    await executeWithCreditTransaction(
      testUserId,
      'EVENT_UPGRADE_500',
      undefined,
      async () => {
        testEventId = await createTestEvent(testUserId);
        return { id: testEventId };
      }
    );
    
    // Then: both event and consumed credit exist
    const db = getAdminDb();
    
    const { data: event } = await db
      .from('events')
      .select('id')
      .eq('id', testEventId)
      .single();
    
    const { data: credit } = await db
      .from('billing_credits')
      .select('status, consumed_event_id')
      .eq('user_id', testUserId)
      .eq('status', 'consumed')
      .single();
    
    expect(event).not.toBeNull();
    expect(credit?.status).toBe('consumed');
    expect(credit?.consumed_event_id).toBe(testEventId);
  });
});

describe('Enforce Event Publish: Error Semantics', () => {
  let testUserId: string;
  
  beforeEach(async () => {
    testUserId = await createTestUser();
  });
  
  afterEach(async () => {
    await cleanup(testUserId);
  });

  /**
   * QA-EEP-1: limits exceeded + confirm_credit absent => 409
   */
  test('exceeds limit without confirm returns 409', async () => {
    // Given: user has credit, event exceeds free limit
    await createTestCredit(testUserId);
    
    // When: enforce without confirmCredit
    const enforcePromise = enforceEventPublish({
      userId: testUserId,
      clubId: null,
      maxParticipants: 100, // exceeds free (15)
      isPaid: false,
    }, false); // confirmCredit = false
    
    // Then: CreditConfirmationRequiredError (409)
    await expect(enforcePromise).rejects.toBeInstanceOf(CreditConfirmationRequiredError);
  });

  /**
   * QA-EEP-2: limits exceeded + no credit => 402
   */
  test('exceeds limit without credit returns 402', async () => {
    // Given: user has NO credit
    
    // When: enforce
    const enforcePromise = enforceEventPublish({
      userId: testUserId,
      clubId: null,
      maxParticipants: 100, // exceeds free (15)
      isPaid: false,
    }, false);
    
    // Then: PaywallError (402)
    await expect(enforcePromise).rejects.toBeInstanceOf(PaywallError);
    await expect(enforcePromise).rejects.toMatchObject({
      reason: 'PUBLISH_REQUIRES_PAYMENT',
    });
  });

  /**
   * QA-EEP-3: limits not exceeded => no error (pass)
   */
  test('within free limits passes without error', async () => {
    // Given: user (any credit status)
    
    // When: enforce within free limits
    const enforcePromise = enforceEventPublish({
      userId: testUserId,
      clubId: null,
      maxParticipants: 10, // within free (15)
      isPaid: false,
    }, false);
    
    // Then: no error, no credit needed
    await expect(enforcePromise).resolves.toEqual({ requiresCredit: false });
  });

  /**
   * QA-EEP-4: limits exceeded + confirm_credit=1 + eligible credit => pass
   */
  test('exceeds limit with confirm and credit passes', async () => {
    // Given: user has credit
    await createTestCredit(testUserId);
    
    // When: enforce with confirmCredit
    const enforcePromise = enforceEventPublish({
      userId: testUserId,
      clubId: null,
      maxParticipants: 100,
      isPaid: false,
    }, true); // confirmCredit = true
    
    // Then: requiresCredit=true (consumption happens in transaction wrapper)
    await expect(enforcePromise).resolves.toEqual({ requiresCredit: true });
  });
});

/**
 * Run:
 * npm test -- credit-consumption.test.ts
 */

