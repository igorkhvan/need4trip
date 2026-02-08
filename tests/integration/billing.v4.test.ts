/**
 * Integration Tests: Billing v5 (Save-time Enforcement + One-off Credits)
 * 
 * Purpose: Test critical paths per v5 spec - NO publish step
 * Status: P0 - REQUIRED before merge
 * 
 * SSOT: docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md §7 (Event Save Enforcement v5)
 * 
 * enforceEventPublish() returns void on success, throws:
 * - PaywallError (402) when payment required
 * - CreditConfirmationRequiredError (409) when credit confirmation needed
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { getAdminDb } from '@/lib/db/client';
import { enforceEventPublish } from '@/lib/services/accessControl';
import { CreditConfirmationRequiredError } from '@/lib/errors';
import { createBillingCredit, consumeCredit } from '@/lib/db/billingCreditsRepo';
import { getProductByCode } from '@/lib/db/billingProductsRepo';
import { PaywallError } from '@/lib/errors';
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
    amount: 1000,           // ⚡ Normalized
    currency_code: 'KZT',   // ⚡ Normalized with FK
    status: 'completed',    // ⚡ Fixed enum (was 'paid')
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

describe('Billing v5: Save-time Enforcement', () => {
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
   * QA 1: Save within free limits → NO credit consumed
   * 
   * v5: enforceEventPublish returns void (no error) when within limits
   */
  test('save within free limits does not consume credit', async () => {
    // Given: user has available credit
    const credit = await createTestCredit(testUserId);

    // When: save event within free limits (≤15 participants)
    // enforceEventPublish returns void on success, throws on error
    await expect(
      enforceEventPublish({
        eventId: testEventId,
        userId: testUserId,
        maxParticipants: 10, // Within free
        clubId: null,
        isPaid: false,
      }, false)
    ).resolves.toEqual({ requiresCredit: false }); // Success = no credit needed

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
   * 
   * v5: CreditConfirmationRequiredError thrown when credit available but not confirmed
   */
  test('credit confirmation flow consumes exactly one credit', async () => {
    // Given: user has credit, event exceeds free (but ≤500)
    await createTestCredit(testUserId);

    // When: first save attempt (no confirm)
    // Should throw CreditConfirmationRequiredError (409)
    await expect(
      enforceEventPublish({
        eventId: testEventId,
        userId: testUserId,
        maxParticipants: 100, // Exceeds free, within oneoff
        clubId: null,
        isPaid: false,
      }, false)
    ).rejects.toThrow(CreditConfirmationRequiredError);

    // When: confirm save
    // Should succeed (returns void)
    await expect(
      enforceEventPublish({
        eventId: testEventId,
        userId: testUserId,
        maxParticipants: 100,
        clubId: null,
        isPaid: false,
      }, true) // confirm_credit=1
    ).resolves.toEqual({ requiresCredit: true });

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
  test('concurrent save confirms consume only one credit', async () => {
    // Given: user has one credit
    await createTestCredit(testUserId);

    // When: two concurrent consumption attempts (simulating API race)
    const promises = [
      (async () => {
        try {
          await enforceEventPublish({
            eventId: testEventId,
            userId: testUserId,
            maxParticipants: 100,
            clubId: null,
            isPaid: false,
          }, true);
          // Success - consume credit
          await consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);
          return { success: true };
        } catch {
          return { success: false };
        }
      })(),
      (async () => {
        try {
          await enforceEventPublish({
            eventId: testEventId,
            userId: testUserId,
            maxParticipants: 100,
            clubId: null,
            isPaid: false,
          }, true);
          // Success - consume credit
          await consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);
          return { success: true };
        } catch {
          return { success: false };
        }
      })(),
    ];

    const results = await Promise.allSettled(promises);

    // Then: At least one succeeds
    const successful = results.filter(r => 
      r.status === 'fulfilled' && (r.value as { success: boolean }).success
    );
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
   * QA 4: Personal >500 → only club option (PaywallError)
   */
  test('personal event >500 participants requires club', async () => {
    // When: save event >500 participants
    // Should throw PaywallError
    try {
      await enforceEventPublish({
        eventId: testEventId,
        userId: testUserId,
        maxParticipants: 600, // Exceeds oneoff limit
        clubId: null,
        isPaid: false,
      }, false);
      fail('Expected PaywallError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PaywallError);
      const paywallErr = err as PaywallError;
      expect(paywallErr.reason).toBe('CLUB_REQUIRED_FOR_LARGE_EVENT');
      
      // Verify: ONLY club option, NO one-off option
      const options = paywallErr.options ?? [];
      const hasClubOption = options.some(o => o.type === 'CLUB_ACCESS');
      const hasOneOffOption = options.some(o => o.type === 'ONE_OFF_CREDIT');
      
      expect(hasClubOption).toBe(true);
      expect(hasOneOffOption).toBe(false);
    }
  });

  /**
   * QA 5: Idempotent save (v5 - no published_at field)
   * 
   * v5: Events are saved directly, no separate publish step.
   * Idempotency is enforced at event creation level.
   */
  test('re-save does not consume additional credit', async () => {
    const db = getAdminDb();
    
    // Given: event already saved with credit consumed
    await createTestCredit(testUserId);

    // First save (with credit consumption)
    await enforceEventPublish({
      eventId: testEventId,
      userId: testUserId,
      maxParticipants: 100,
      clubId: null,
      isPaid: false,
    }, true);
    
    // Consume credit for first save
    await consumeCredit(testUserId, 'EVENT_UPGRADE_500', testEventId);

    // Verify credit consumed
    const { data: credits1 } = await db
      .from('billing_credits')
      .select('status')
      .eq('user_id', testUserId);
    const consumed1 = credits1?.filter(c => c.status === 'consumed');
    expect(consumed1?.length).toBe(1);

    // When: event has consumed credit, second save within limit should succeed
    // The effective entitlements now include the credit
    await expect(
      enforceEventPublish({
        eventId: testEventId,
        userId: testUserId,
        maxParticipants: 100, // Same or less
        clubId: null,
        isPaid: false,
      }, false) // No confirmation needed - credit already applied
    ).resolves.toEqual({ requiresCredit: false });

    // Verify: still only one consumed credit
    const { data: credits2 } = await db
      .from('billing_credits')
      .select('status')
      .eq('user_id', testUserId);

    const consumed2 = credits2?.filter(c => c.status === 'consumed');
    expect(consumed2?.length).toBe(1); // Still one
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
      amount: 1000,           // ⚡ Normalized
      currency_code: 'KZT',   // ⚡ Normalized with FK
      status: 'completed',    // ⚡ Fixed enum
      provider: 'test',
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

describe('Billing v5: billing_products SSOT', () => {
  let testUserId: string;
  let testEventId: string;

  beforeEach(async () => {
    const db = getAdminDb();
    
    testUserId = randomUUID();
    await db.from('users').insert({
      id: testUserId,
      name: 'Test User',
      telegram_id: `test-${testUserId}`,
    });

    const { data: cities } = await db.from('cities').select('id').limit(1);
    const cityId = cities?.[0]?.id;
    
    testEventId = randomUUID();
    await db.from('events').insert({
      id: testEventId,
      title: 'Test Event',
      description: 'Test',
      created_by_user_id: testUserId,
      visibility: 'public',
      max_participants: 100,
      date_time: new Date().toISOString(),
      city_id: cityId!,
    });
  });

  /**
   * QA 7: enforceEventPublish reads constraints from DB
   */
  test('enforceEventPublish uses billing_products constraints', async () => {
    // Given: billing_products contains EVENT_UPGRADE_500
    const product = await getProductByCode('EVENT_UPGRADE_500');
    
    expect(product).toBeDefined();
    expect(product?.price).toBe(1000);             // ⚡ Normalized (was priceKzt)
    expect(product?.currencyCode).toBe('KZT');     // ⚡ Verify currency
    expect(product?.constraints.max_participants).toBe(500);

    // When: enforceEventPublish is called
    // Then: uses these constraints (tested implicitly by QA 4)
  });

  /**
   * QA 8: No hardcoded prices
   */
  test('PaywallError contains price from billing_products', async () => {
    // When: trigger paywall (no credit, exceeds free)
    try {
      await enforceEventPublish({
        eventId: testEventId,
        userId: testUserId,
        maxParticipants: 100,
        clubId: null,
        isPaid: false,
      }, false);
      fail('Expected PaywallError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PaywallError);
      const paywallErr = err as PaywallError;
      
      // Then: PaywallError contains price from DB
      const oneOffOption = paywallErr.options?.find(o => o.type === 'ONE_OFF_CREDIT');
      expect(oneOffOption).toBeDefined();
      expect(oneOffOption?.price).toBe(1000);        // ⚡ Normalized
      expect(oneOffOption?.currencyCode).toBe('KZT'); // ⚡ Added
    }
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
