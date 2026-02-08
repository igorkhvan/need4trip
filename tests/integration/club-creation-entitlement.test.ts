/**
 * Integration Tests: Club Creation Subscription Entitlement Flow
 * 
 * Purpose: Automated QA for Phase P2 / Step 5
 * Scope: ADR-002, UX_CONTRACT_CLUB_CREATION, SSOT_API (API-015)
 * 
 * Tests:
 * - S1: No entitlement → HTTP 402
 * - S2: Active entitlement → HTTP 201, club created, entitlement consumed
 * - S3: Consumed entitlement → HTTP 402
 * - S4: Expired entitlement → HTTP 402
 * - Race condition: Parallel create attempts
 * 
 * SSOT References:
 * - docs/adr/active/ADR-002_PRE_CLUB_SUBSCRIPTION_ENTITLEMENTS.md
 * - docs/ui-contracts/system/UX_CONTRACT_CLUB_CREATION.md
 * - docs/ssot/SSOT_API.md (API-015)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { getAdminDb } from '@/lib/db/client';
import { createTestUser, createAuthenticatedRequest, getTestCityId } from '../helpers/auth';
import { randomUUID } from 'crypto';

/**
 * Helper: Create test entitlement
 */
async function createTestEntitlement(params: {
  userId: string;
  planId: string;
  status: 'active' | 'consumed' | 'expired' | 'cancelled';
  validFrom: Date;
  validUntil: Date;
  clubId?: string | null;
}): Promise<string> {
  const db = getAdminDb();
  const entitlementId = randomUUID();
  
  const { error } = await db.from('club_subscription_entitlements').insert({
    id: entitlementId,
    user_id: params.userId,
    plan_id: params.planId,
    status: params.status,
    valid_from: params.validFrom.toISOString(),
    valid_until: params.validUntil.toISOString(),
    club_id: params.clubId ?? null,
    consumed_at: params.status === 'consumed' ? new Date().toISOString() : null,
  });
  
  if (error) {
    throw new Error(`Failed to create test entitlement: ${error.message}`);
  }
  
  return entitlementId;
}

/**
 * Helper: Get valid plan_id from database
 */
async function getTestPlanId(): Promise<string> {
  const db = getAdminDb();
  const { data, error } = await db.from('club_plans').select('id').limit(1);
  
  if (error || !data || data.length === 0) {
    throw new Error('No club_plans found in database - seed data missing');
  }
  
  return data[0].id;
}

describe('API: POST /api/clubs - Entitlement Flow', () => {
  let testUserIdNoEntitlement: string;
  let testUserIdActiveEntitlement: string;
  let testUserIdConsumedEntitlement: string;
  let testUserIdExpiredEntitlement: string;
  let cleanupNoEntitlement: (() => Promise<void>) | undefined;
  let cleanupActiveEntitlement: (() => Promise<void>) | undefined;
  let cleanupConsumedEntitlement: (() => Promise<void>) | undefined;
  let cleanupExpiredEntitlement: (() => Promise<void>) | undefined;
  let testPlanId: string;
  let testCityId: string;

  beforeEach(async () => {
    // Get test plan_id and city_id
    testPlanId = await getTestPlanId();
    testCityId = await getTestCityId();

    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    // Create user with no entitlement
    const userNoEntitlement = await createTestUser();
    testUserIdNoEntitlement = userNoEntitlement.user.id;
    cleanupNoEntitlement = userNoEntitlement.cleanup;

    // Create user with active entitlement
    const userActiveEntitlement = await createTestUser();
    testUserIdActiveEntitlement = userActiveEntitlement.user.id;
    cleanupActiveEntitlement = userActiveEntitlement.cleanup;
    
    await createTestEntitlement({
      userId: testUserIdActiveEntitlement,
      planId: testPlanId,
      status: 'active',
      validFrom: now,
      validUntil,
      clubId: null,
    });

    // Create user with consumed entitlement
    const userConsumedEntitlement = await createTestUser();
    testUserIdConsumedEntitlement = userConsumedEntitlement.user.id;
    cleanupConsumedEntitlement = userConsumedEntitlement.cleanup;
    
    // Create a club first to consume the entitlement
    const consumedClubId = randomUUID();
    const db = getAdminDb();
    
    // Create club with all required fields (unique slug per test)
    const { error: clubError } = await db.from('clubs').insert({
      id: consumedClubId,
      name: 'Consumed Club',
      slug: `consumed-club-${consumedClubId.slice(0, 8)}`,
      owner_user_id: testUserIdConsumedEntitlement,
      created_by: testUserIdConsumedEntitlement,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    
    if (clubError) {
      throw new Error(`Failed to create consumed club: ${clubError.message}`);
    }
    
    // Create club_subscription for the club (required by RPC)
    const { error: subError } = await db.from('club_subscriptions').insert({
      club_id: consumedClubId,
      plan_id: testPlanId,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: validUntil.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    
    if (subError) {
      throw new Error(`Failed to create club_subscription: ${subError.message}`);
    }
    
    // Add owner to club_members (required by schema)
    // Check if member already exists (idempotent)
    const { data: existingMember } = await db
      .from('club_members')
      .select('*')
      .eq('club_id', consumedClubId)
      .eq('user_id', testUserIdConsumedEntitlement)
      .maybeSingle();
    
    if (!existingMember) {
      const { error: memberError } = await db.from('club_members').insert({
        club_id: consumedClubId,
        user_id: testUserIdConsumedEntitlement,
        role: 'owner',
        joined_at: now.toISOString(),
      });
      
      if (memberError) {
        throw new Error(`Failed to create club_member: ${memberError.message}`);
      }
    }
    
    // Now create consumed entitlement linked to the club
    await createTestEntitlement({
      userId: testUserIdConsumedEntitlement,
      planId: testPlanId,
      status: 'consumed',
      validFrom: now,
      validUntil,
      clubId: consumedClubId,
    });

    // Create user with expired entitlement
    const userExpiredEntitlement = await createTestUser();
    testUserIdExpiredEntitlement = userExpiredEntitlement.user.id;
    cleanupExpiredEntitlement = userExpiredEntitlement.cleanup;
    
    const expiredValidFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // -60 days
    const expiredValidUntil = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // -30 days (expired)
    // Expired entitlement should have club_id = null (never consumed)
    await createTestEntitlement({
      userId: testUserIdExpiredEntitlement,
      planId: testPlanId,
      status: 'expired',
      validFrom: expiredValidFrom,
      validUntil: expiredValidUntil,
      clubId: null, // Expired but never consumed
    });
  });

  afterEach(async () => {
    const db = getAdminDb();
    
    // Cleanup test data (safe - handle undefined)
    // Note: Deleting users will cascade delete entitlements, but we need to clean up clubs manually
    if (cleanupNoEntitlement) await cleanupNoEntitlement();
    if (cleanupActiveEntitlement && testUserIdActiveEntitlement) {
      // Delete clubs created by this user (cascade will handle members/subscriptions)
      await db.from('clubs').delete().eq('owner_user_id', testUserIdActiveEntitlement);
      await cleanupActiveEntitlement();
    }
    if (cleanupConsumedEntitlement && testUserIdConsumedEntitlement) {
      // Delete clubs created by this user
      await db.from('clubs').delete().eq('owner_user_id', testUserIdConsumedEntitlement);
      await cleanupConsumedEntitlement();
    }
    if (cleanupExpiredEntitlement) await cleanupExpiredEntitlement();
  });

  /**
   * Test S1: No entitlement → HTTP 402
   */
  test('S1: No entitlement returns HTTP 402 with CLUB_CREATION_REQUIRES_PLAN', async () => {
    const { POST } = await import('@/app/api/clubs/route');
    
    const req = createAuthenticatedRequest(
      'http://localhost:3000/api/clubs',
      testUserIdNoEntitlement,
      {
        body: JSON.stringify({
          name: 'Test Club',
          cityIds: [testCityId],
        }),
      }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    // Then: HTTP 402
    expect(res.status).toBe(402);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('PAYWALL');
    expect(data.error.details?.reason).toBe('CLUB_CREATION_REQUIRES_PLAN');
    
    // Verify: No club created in DB
    const db = getAdminDb();
    const { data: clubs } = await db
      .from('clubs')
      .select('id')
      .eq('owner_user_id', testUserIdNoEntitlement);
    
    expect(clubs?.length).toBe(0);
  });

  /**
   * Test S2: Active entitlement → HTTP 201, club created, entitlement consumed
   */
  test('S2: Active entitlement allows club creation and consumes entitlement', async () => {
    const { POST } = await import('@/app/api/clubs/route');
    
    const req = createAuthenticatedRequest(
      'http://localhost:3000/api/clubs',
      testUserIdActiveEntitlement,
      {
        body: JSON.stringify({
          name: 'Test Club Active',
          cityIds: [testCityId],
        }),
      }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    // Then: HTTP 201
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.club).toBeDefined();
    expect(data.data.club.name).toBe('Test Club Active');
    
    const createdClubId = data.data.club.id;
    
    // Verify: Club exists in DB
    const db = getAdminDb();
    const { data: club } = await db
      .from('clubs')
      .select('*')
      .eq('id', createdClubId)
      .single();
    
    expect(club).toBeDefined();
    expect(club?.owner_user_id).toBe(testUserIdActiveEntitlement);
    
    // Verify: Entitlement consumed
    const { data: entitlement } = await db
      .from('club_subscription_entitlements')
      .select('*')
      .eq('user_id', testUserIdActiveEntitlement)
      .single();
    
    expect(entitlement).toBeDefined();
    expect(entitlement?.status).toBe('consumed');
    expect(entitlement?.club_id).toBe(createdClubId);
    expect(entitlement?.consumed_at).toBeDefined();
    
    // Verify: club_subscriptions created
    const { data: subscription } = await db
      .from('club_subscriptions')
      .select('*')
      .eq('club_id', createdClubId)
      .single();
    
    expect(subscription).toBeDefined();
    expect(subscription?.plan_id).toBe(testPlanId);
    expect(subscription?.status).toBe('active');
    
    // Verify: Owner added to club_members
    const { data: member } = await db
      .from('club_members')
      .select('*')
      .eq('club_id', createdClubId)
      .eq('user_id', testUserIdActiveEntitlement)
      .single();
    
    expect(member).toBeDefined();
    expect(member?.role).toBe('owner');
  });

  /**
   * Test S3: Consumed entitlement → HTTP 402
   */
  test('S3: Consumed entitlement returns HTTP 402', async () => {
    const { POST } = await import('@/app/api/clubs/route');
    
    const req = createAuthenticatedRequest(
      'http://localhost:3000/api/clubs',
      testUserIdConsumedEntitlement,
      {
        body: JSON.stringify({
          name: 'Test Club Consumed',
          cityIds: [testCityId],
        }),
      }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    // Then: HTTP 402
    expect(res.status).toBe(402);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('PAYWALL');
    expect(data.error.details?.reason).toBe('CLUB_CREATION_REQUIRES_PLAN');
    
    // Verify: No new club created
    const db = getAdminDb();
    const { data: clubs } = await db
      .from('clubs')
      .select('id')
      .eq('owner_user_id', testUserIdConsumedEntitlement);
    
    // Should only have the pre-existing club
    expect(clubs?.length).toBe(1);
  });

  /**
   * Test S4: Expired entitlement → HTTP 402
   */
  test('S4: Expired entitlement returns HTTP 402', async () => {
    const { POST } = await import('@/app/api/clubs/route');
    
    const req = createAuthenticatedRequest(
      'http://localhost:3000/api/clubs',
      testUserIdExpiredEntitlement,
      {
        body: JSON.stringify({
          name: 'Test Club Expired',
          cityIds: [testCityId],
        }),
      }
    );
    
    const res = await POST(req);
    const data = await res.json();
    
    // Then: HTTP 402
    expect(res.status).toBe(402);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('PAYWALL');
    expect(data.error.details?.reason).toBe('CLUB_CREATION_REQUIRES_PLAN');
    
    // Verify: No club created
    const db = getAdminDb();
    const { data: clubs } = await db
      .from('clubs')
      .select('id')
      .eq('owner_user_id', testUserIdExpiredEntitlement);
    
    expect(clubs?.length).toBe(0);
  });

  /**
   * Test: Race condition - Parallel create attempts
   */
  test('Race condition: Parallel create attempts - only one succeeds', async () => {
    const { POST } = await import('@/app/api/clubs/route');
    
    // Create user with single active entitlement
    const userRace = await createTestUser();
    const testUserIdRace = userRace.user.id;
    
    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await createTestEntitlement({
      userId: testUserIdRace,
      planId: testPlanId,
      status: 'active',
      validFrom: now,
      validUntil,
      clubId: null,
    });
    
    // Fire 2 concurrent requests
    const req1 = createAuthenticatedRequest(
      'http://localhost:3000/api/clubs',
      testUserIdRace,
      {
        body: JSON.stringify({
          name: 'Race Club 1',
          cityIds: [testCityId],
        }),
      }
    );
    
    const req2 = createAuthenticatedRequest(
      'http://localhost:3000/api/clubs',
      testUserIdRace,
      {
        body: JSON.stringify({
          name: 'Race Club 2',
          cityIds: [testCityId],
        }),
      }
    );
    
    const [res1, res2] = await Promise.all([
      POST(req1),
      POST(req2),
    ]);
    
    const data1 = await res1.json();
    const data2 = await res2.json();
    
    // Then: Exactly one succeeds (201), other returns 402
    const successCount = [res1.status, res2.status].filter(s => s === 201).length;
    const failCount = [res1.status, res2.status].filter(s => s === 402).length;
    
    expect(successCount).toBe(1);
    expect(failCount).toBe(1);
    
    // Verify: Exactly one club created
    const db = getAdminDb();
    const { data: clubs } = await db
      .from('clubs')
      .select('id')
      .eq('owner_user_id', testUserIdRace);
    
    expect(clubs?.length).toBe(1);
    
    // Verify: Entitlement consumed exactly once
    const { data: entitlements } = await db
      .from('club_subscription_entitlements')
      .select('*')
      .eq('user_id', testUserIdRace);
    
    const consumedEntitlements = entitlements?.filter(e => e.status === 'consumed') ?? [];
    expect(consumedEntitlements.length).toBe(1);
    
    // Cleanup
    await userRace.cleanup();
  });
});
