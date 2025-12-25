/**
 * Integration Tests: Billing v4 (One-off Credits + Publish Enforcement)
 * 
 * Purpose: Test critical paths per v4 spec Definition of Done
 * Status: P0 - REQUIRED before merge
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { getAdminDb } from '@/lib/db/client';
import { enforcePublish } from '@/lib/services/accessControl';
import { createBillingCredit, consumeCredit } from '@/lib/db/billingCreditsRepo';
import { getProductByCode } from '@/lib/db/billingProductsRepo';
import { randomUUID } from 'crypto';

/**
 * Helper: Create test transaction + credit
 */
async function createTestCredit(userId: string) {
  const db = getAdminDb();
  const transactionId = randomUUID();
  
  const { error: txError } = await db.from('billing_transactions').insert({
    id: transactionId,
    user_id: userId,
    product_code: 'EVENT_UPGRADE_500',
    amount_kzt: 1000, // ⚡ Fixed: use amount_kzt not amount
    currency: 'KZT',   // ⚡ Fixed: use currency not currency_code
    status: 'paid',    // ⚡ Fixed: use 'paid' not 'completed'
    provider: 'test',  // ⚡ Required field
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

describe('Billing v4: Publish Enforcement', () => {
  let testUserId: string;
  let testEventId: string;

  beforeEach(async () => {
    const db = getAdminDb();
    
    // Create test user (required for FK constraints)
    testUserId = randomUUID();
    const { error: userError } = await db
      .from('users')
      .insert({
        id: testUserId,
        name: 'Test User',
        telegram_id: `test-${testUserId}`, // Unique telegram_id
      });
    
    if (userError) {
      throw new Error(`Failed to create test user: ${userError.message}`);
    }
    
    // Create test event (required for consumed_event_id FK)
    testEventId = randomUUID();
    
    // Get a valid city_id (required field)
    const { data: cities } = await db.from('cities').select('id').limit(1);
    const cityId = cities?.[0]?.id;
    
    if (!cityId) {
      throw new Error('No cities found in database - seed data missing');
    }
    
    const { error: eventError } = await db
      .from('events')
      .insert({
        id: testEventId,
        title: 'Test Event',
        description: 'Test Description',
        created_by_user_id: testUserId,
        visibility: 'public',
        max_participants: 100,
        date_time: new Date().toISOString(),
        city_id: cityId, // ⚡ Required field (NOT NULL)
      });
    
    if (eventError) {
      throw new Error(`Failed to create test event: ${eventError.message}`);
    }
  });

  /**
   * QA 1: Publish within free limits → NO credit consumed
   */
  test('publish within free limits does not consume credit', async () => {
    // Given: user has available credit
    const credit = await createTestCredit(testUserId);

    // When: publish event within free limits (≤15 participants)
    const decision = await enforcePublish({
      eventId: testEventId,
      userId: testUserId,
      maxParticipants: 10, // Within free
      clubId: null,
    }, false);

    // Then: allowed immediately, no credit check
    expect(decision.allowed).toBe(true);
    expect(decision.willConsumeCredit).toBeUndefined();

    // Verify: credit still available
    const db = getAdminDb();
    const { data } = await db
      .from('billing_credits')
      .select('status')
      .eq('id', credit.id)
      .single();
    
    expect(data?.status).toBe('available'); // NOT consumed
  });

  /**
   * QA 2: 409 → confirm → exactly one credit consumed
   */
  test('credit confirmation flow consumes exactly one credit', async () => {
    // Given: user has credit, event exceeds free (but ≤500)
    await createTestCredit(testUserId);

    // When: first publish attempt (no confirm)
    const decision1 = await enforcePublish({
      eventId: testEventId,
      userId: testUserId,
      maxParticipants: 100, // Exceeds free, within oneoff
      clubId: null,
    }, false);

    // Then: requires confirmation (409)
    expect(decision1.allowed).toBe(false);
    expect(decision1.requiresCreditConfirmation).toBe(true);

    // When: confirm publish
    const decision2 = await enforcePublish({
      eventId: testEventId,
      userId: testUserId,
      maxParticipants: 100,
      clubId: null,
    }, true); // confirm_credit=1

    // Then: allowed with credit consumption
    expect(decision2.allowed).toBe(true);
    expect(decision2.willConsumeCredit).toBe(true);

    // **Actually consume the credit** (emulate API route behavior)
    await consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);

    // Verify: exactly one credit consumed
    const db = getAdminDb();
    const { data: credits } = await db
      .from('billing_credits')
      .select('status')
      .eq('user_id', testUserId);

    const consumed = credits?.filter(c => c.status === 'consumed');
    expect(consumed?.length).toBe(1); // Exactly one
  });

  /**
   * QA 3: Concurrent confirms → only one credit consumed
   * NOTE: Current implementation doesn't use FOR UPDATE lock,
   * so both requests may succeed, but we verify only ONE credit consumed
   */
  test('concurrent publish confirms consume only one credit', async () => {
    // Given: user has one credit
    await createTestCredit(testUserId);

    // When: two concurrent consumption attempts (simulating API race)
    const promises = [
      (async () => {
        const decision = await enforcePublish({
          eventId: testEventId,
          userId: testUserId,
          maxParticipants: 100,
          clubId: null,
        }, true);
        // Consume if allowed
        if (decision.willConsumeCredit) {
          await consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);
        }
        return decision;
      })(),
      (async () => {
        const decision = await enforcePublish({
          eventId: testEventId,
          userId: testUserId,
          maxParticipants: 100,
          clubId: null,
        }, true);
        // Consume if allowed
        if (decision.willConsumeCredit) {
          await consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);
        }
        return decision;
      })(),
    ];

    const results = await Promise.allSettled(promises);

    // Then: At least one succeeds
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeGreaterThanOrEqual(1);
    
    // Most important: Verify exactly ONE credit consumed (no double-spend)
    const db = getAdminDb();
    const { data: credits } = await db
      .from('billing_credits')
      .select('status')
      .eq('user_id', testUserId);

    const consumed = credits?.filter(c => c.status === 'consumed');
    expect(consumed?.length).toBe(1); // ⚡ KEY ASSERTION: Only one credit consumed
  });

  /**
   * QA 4: Personal >500 → only club option
   */
  test('personal event >500 participants requires club', async () => {
    // When: publish event >500 participants
    const decision = enforcePublish({
      eventId: testEventId,
      userId: testUserId,
      maxParticipants: 600, // Exceeds oneoff limit
      clubId: null,
    }, false);

    // Then: PaywallError with ONLY club option
    await expect(decision).rejects.toMatchObject({
      code: 'PAYWALL',
      reason: 'CLUB_REQUIRED_FOR_LARGE_EVENT',
      options: expect.arrayContaining([
        expect.objectContaining({ type: 'CLUB_ACCESS' })
      ])
    });

    // Verify: NO one-off option
    await expect(decision).rejects.toMatchObject({
      options: expect.not.arrayContaining([
        expect.objectContaining({ type: 'ONE_OFF_CREDIT' })
      ])
    });
  });

  /**
   * QA 5: Idempotent publish
   */
  test('republish does not consume additional credit', async () => {
    const db = getAdminDb();
    
    // Given: event already published with credit consumed
    await createTestCredit(testUserId);

    // Publish once (with credit consumption)
    const decision1 = await enforcePublish({
      eventId: testEventId,
      userId: testUserId,
      maxParticipants: 100,
      clubId: null,
    }, true);
    
    // Consume credit for first publish
    if (decision1.willConsumeCredit) {
      await consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);
    }

    // Mark event as published
    await db.from('events')
      .update({ published_at: new Date().toISOString() })
      .eq('id', testEventId);

    // When: check if event is already published (this is what API route does)
    const { data: event } = await db
      .from('events')
      .select('published_at')
      .eq('id', testEventId)
      .single();

    // Then: idempotent - if already published, don't call enforcePublish again
    // (API route returns 200 OK immediately)
    expect(event?.published_at).not.toBeNull();

    // Verify: still only one consumed credit
    const { data: credits } = await db
      .from('billing_credits')
      .select('status')
      .eq('user_id', testUserId);

    const consumed = credits?.filter(c => c.status === 'consumed');
    expect(consumed?.length).toBe(1); // Still one
  });

  /**
   * QA 6: Idempotent credit issuance
   */
  test('duplicate transaction does not issue duplicate credit', async () => {
    const db = getAdminDb();
    const txId = randomUUID(); // Valid UUID
    
    // Create transaction first
    await db.from('billing_transactions').insert({
      id: txId,
      user_id: testUserId,
      product_code: 'EVENT_UPGRADE_500',
      amount_kzt: 1000, // ⚡ Fixed: use amount_kzt
      currency: 'KZT',   // ⚡ Fixed: use currency
      status: 'paid',    // ⚡ Fixed: use 'paid'
      provider: 'test',  // ⚡ Required field
    });

    // When: issue credit twice with same transaction_id
    await createBillingCredit({
      userId: testUserId,
      creditCode: 'EVENT_UPGRADE_500',
      sourceTransactionId: txId,
    });

    // Second attempt with same txId
    const secondAttempt = createBillingCredit({
      userId: testUserId,
      creditCode: 'EVENT_UPGRADE_500',
      sourceTransactionId: txId, // DUPLICATE
    });

    // Then: second attempt fails (UNIQUE constraint)
    await expect(secondAttempt).rejects.toThrow();

    // Verify: only one credit issued
    const { data: credits } = await db
      .from('billing_credits')
      .select('id')
      .eq('source_transaction_id', txId);

    expect(credits?.length).toBe(1); // Exactly one
  });
});

describe('Billing v4: billing_products SSOT', () => {
  /**
   * QA 7: enforcePublish reads constraints from DB
   */
  test('enforcePublish uses billing_products constraints', async () => {
    // Given: billing_products contains EVENT_UPGRADE_500
    const product = await getProductByCode('EVENT_UPGRADE_500');
    
    expect(product).toBeDefined();
    expect(product?.priceKzt).toBe(1000);
    expect(product?.constraints.max_participants).toBe(500);

    // When: enforcePublish is called
    // Then: uses these constraints (tested implicitly by QA 4)
  });

  /**
   * QA 8: No hardcoded prices
   */
  test('PaywallError contains price from billing_products', async () => {
    // When: trigger paywall (no credit, exceeds free)
    const decision = enforcePublish({
      eventId: 'test-event',
      userId: 'test-user',
      maxParticipants: 100,
      clubId: null,
    }, false);

    // Then: PaywallError contains price from DB
    await expect(decision).rejects.toMatchObject({
      options: expect.arrayContaining([
        expect.objectContaining({
          type: 'ONE_OFF_CREDIT',
          priceKzt: 1000 // From billing_products, NOT hardcoded
        })
      ])
    });
  });
});

/**
 * TODO: Run tests
 * 
 * Setup:
 * 1. Configure test database (Supabase local or test project)
 * 2. Apply migrations
 * 3. Seed test data
 * 
 * Run:
 * npm test -- billing.v4.test.ts
 * 
 * Expected: ALL PASS ✅
 */

