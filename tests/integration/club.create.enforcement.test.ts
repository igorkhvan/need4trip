/**
 * Integration Tests: Club Creation Subscription Enforcement
 *
 * PHASE FIX — CLUB CREATE SUBSCRIPTION ENFORCEMENT
 * - User WITHOUT active club subscription → POST createClub → 402 PaywallError, reason CLUB_CREATION_REQUIRES_PLAN
 * - User WITH active club subscription → POST createClub → 201, club created
 *
 * Backend-only guard: enforceClubCreation() in createClub() before createClubRepo().
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { getAdminDb } from '@/lib/db/client';
import { createClub } from '@/lib/services/clubs';
import { createClub as createClubRepo } from '@/lib/db/clubRepo';
import { upsertClubSubscription } from '@/lib/db/clubSubscriptionRepo';
import { PaywallError } from '@/lib/errors';
import type { CurrentUser } from '@/lib/auth/currentUser';
import { randomUUID } from 'crypto';

describe('Club Creation Subscription Enforcement', () => {
  let testUserId: string;
  let testCityId: string;
  let currentUser: CurrentUser;

  function validCreateBody(uniqueName?: string) {
    return {
      name: uniqueName ?? `New Test Club ${randomUUID().slice(0, 8)}`,
      description: 'Description',
      cityIds: [testCityId],
      logoUrl: null,
      telegramUrl: null,
      websiteUrl: null,
    };
  }

  beforeEach(async () => {
    const db = getAdminDb();

    testUserId = randomUUID();
    const { error: userError } = await db.from('users').insert({
      id: testUserId,
      name: 'Test User',
      telegram_id: `test-${testUserId}`,
    });
    if (userError) throw new Error(`Failed to create test user: ${userError.message}`);

    const { data: cities } = await db.from('cities').select('id').limit(1);
    const cityId = cities?.[0]?.id;
    if (!cityId) throw new Error('No cities in database');
    testCityId = cityId;

    currentUser = { id: testUserId, name: 'Test User', telegramId: `test-${testUserId}` };
  });

  /**
   * Case 1: Authenticated user WITHOUT active club subscription
   * POST /api/clubs → createClub → expect 402 PaywallError, reason CLUB_CREATION_REQUIRES_PLAN, no club created
   */
  test('user without active club subscription gets 402 PaywallError (CLUB_CREATION_REQUIRES_PLAN)', async () => {
    let err: unknown;
    try {
      await createClub(validCreateBody(), currentUser);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(PaywallError);
    expect((err as PaywallError).statusCode).toBe(402);
    expect((err as PaywallError).reason).toBe('CLUB_CREATION_REQUIRES_PLAN');

    const db = getAdminDb();
    const { data: clubs } = await db.from('clubs').select('id').eq('created_by', testUserId);
    expect(clubs?.length ?? 0).toBe(0);
  });

  /**
   * Case 2: Authenticated user WITH active club subscription
   * POST /api/clubs → createClub → expect 201 Created, club created successfully
   */
  test('user with active club subscription can create club (201)', async () => {
    const seedName = `Seed Club ${randomUUID().slice(0, 8)}`;
    const seedClub = await createClubRepo({
      name: seedName,
      description: null,
      cityIds: [testCityId],
      logoUrl: null,
      telegramUrl: null,
      websiteUrl: null,
      createdBy: testUserId,
    });
    await upsertClubSubscription({
      clubId: seedClub.id,
      planId: 'club_50',
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: null,
      graceUntil: null,
    });

    const club = await createClub(validCreateBody(), currentUser);

    expect(club).toBeDefined();
    expect(club.id).toBeDefined();
    expect(club.name).toMatch(/^New Test Club/);

    const db = getAdminDb();
    const { data: clubs } = await db.from('clubs').select('id').eq('created_by', testUserId);
    expect(clubs?.length).toBe(2);
  });
});
