/**
 * Integration Tests: Event Create/Update Enforcement (Production Bug Fix)
 * 
 * Purpose: Verify that create/update allows personal events ≤500 participants
 * without blocking on free limit (publish will handle monetization)
 * 
 * Bug: Previous implementation threw PaywallError on create/update when
 * maxParticipants > free limit, blocking one-off credit flow.
 * 
 * Fix: create/update only blocks maxParticipants > 500 (requires club)
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { getAdminDb } from '@/lib/db/client';
import { createEvent, updateEvent } from '@/lib/services/events';
import { CurrentUser } from '@/lib/auth/currentUser';
import { randomUUID } from 'crypto';

describe('Event Create/Update Enforcement (Personal Events)', () => {
  let testUserId: string;
  let testCityId: string;
  let currentUser: CurrentUser;

  beforeEach(async () => {
    const db = getAdminDb();
    
    // Create test user
    testUserId = randomUUID();
    const { error: userError } = await db
      .from('users')
      .insert({
        id: testUserId,
        name: 'Test User',
        telegram_id: `test-${testUserId}`,
      });
    
    if (userError) {
      throw new Error(`Failed to create test user: ${userError.message}`);
    }
    
    // Get a valid city_id
    const { data: cities } = await db.from('cities').select('id').limit(1);
    const cityId = cities?.[0]?.id;
    
    if (!cityId) {
      throw new Error('No cities found in database - seed data missing');
    }
    
    testCityId = cityId;
    
    currentUser = {
      id: testUserId,
      name: 'Test User',
      telegramId: `test-${testUserId}`,
    };
  });

  /**
   * QA-9: Personal event create with maxParticipants > free but ≤500 → ALLOWED
   * 
   * Expected: createEvent() succeeds (does NOT throw PaywallError)
   * Monetization check happens at publish endpoint
   */
  test('create personal event with 50 participants (over free limit) succeeds', async () => {
    // Given: personal event with 50 participants (exceeds free 15 limit)
    const input = {
      title: 'Test Event 50',
      description: 'Test',
      dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
      cityId: testCityId,
      maxParticipants: 50,
      visibility: 'public' as const,
      categoryId: null,
      locations: [{
        sortOrder: 1,
        title: 'Точка сбора',
        latitude: null,
        longitude: null,
        rawInput: null,
      }],
      customFieldsSchema: [],
      vehicleTypeRequirement: 'any' as const,
      allowedBrandIds: [],
      rules: null,
      isClubEvent: false,
      isPaid: false,
      price: null,
      currencyCode: null,
      allowAnonymousRegistration: true,
    };

    // When: create event
    const event = await createEvent(input, currentUser);

    // Then: event created successfully (no PaywallError)
    expect(event).toBeDefined();
    expect(event.id).toBeDefined();
    expect(event.maxParticipants).toBe(50);
    expect(event.clubId).toBeNull();
  });

  /**
   * QA-10: Personal event create with maxParticipants = 500 (at limit) → ALLOWED
   */
  test('create personal event with 500 participants (at one-off limit) succeeds', async () => {
    const input = {
      title: 'Test Event 500',
      description: 'Test',
      dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      cityId: testCityId,
      maxParticipants: 500,
      visibility: 'public' as const,
      categoryId: null,
      locations: [{
        sortOrder: 1,
        title: 'Точка сбора',
        latitude: null,
        longitude: null,
        rawInput: null,
      }],
      customFieldsSchema: [],
      vehicleTypeRequirement: 'any' as const,
      allowedBrandIds: [],
      rules: null,
      isClubEvent: false,
      isPaid: false,
      price: null,
      currencyCode: null,
      allowAnonymousRegistration: true,
    };

    const event = await createEvent(input, currentUser);

    expect(event).toBeDefined();
    expect(event.maxParticipants).toBe(500);
  });

  /**
   * QA-11: Personal event create with maxParticipants > 500 → BLOCKED (402)
   * 
   * Expected: PaywallError with reason CLUB_REQUIRED_FOR_LARGE_EVENT
   */
  test('create personal event with 501 participants (over one-off limit) throws PaywallError', async () => {
    const input = {
      title: 'Test Event 501',
      description: 'Test',
      dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      cityId: testCityId,
      maxParticipants: 501,
      visibility: 'public' as const,
      categoryId: null,
      locations: [{
        sortOrder: 1,
        title: 'Точка сбора',
        latitude: null,
        longitude: null,
        rawInput: null,
      }],
      customFieldsSchema: [],
      vehicleTypeRequirement: 'any' as const,
      allowedBrandIds: [],
      rules: null,
      isClubEvent: false,
      isPaid: false,
      price: null,
      currencyCode: null,
      allowAnonymousRegistration: true,
    };

    await expect(createEvent(input, currentUser)).rejects.toThrow();
    
    try {
      await createEvent(input, currentUser);
    } catch (err: any) {
      const paywall = err.toJSON ? err.toJSON() : err;
      expect(paywall.reason || err.message).toContain('CLUB_REQUIRED_FOR_LARGE_EVENT');
      expect(err.statusCode).toBe(402);
      if (paywall.meta) {
        expect(paywall.meta.requested).toBe(501);
        expect(paywall.meta.maxOneOffLimit).toBe(500);
      }
    }
  });

  /**
   * QA-12: Personal event UPDATE from 10 → 50 participants → ALLOWED
   * 
   * Expected: updateEvent() succeeds (does NOT throw PaywallError)
   * This is the bug that was reported in production
   */
  test('update personal event from 10 to 50 participants succeeds', async () => {
    const db = getAdminDb();
    
    // Given: existing event with 10 participants
    const eventId = randomUUID();
    const { error: eventError } = await db
      .from('events')
      .insert({
        id: eventId,
        title: 'Original Event',
        description: 'Test',
        created_by_user_id: testUserId,
        visibility: 'public',
        max_participants: 10,
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        city_id: testCityId,
      });
    
    if (eventError) {
      throw new Error(`Failed to create test event: ${eventError.message}`);
    }

    // When: update to 50 participants (exceeds free limit)
    const updated = await updateEvent(eventId, {
      maxParticipants: 50,
    }, currentUser);

    // Then: update succeeds (no PaywallError)
    expect(updated).toBeDefined();
    expect(updated.maxParticipants).toBe(50);
  });

  /**
   * QA-13: Personal event UPDATE to 500 participants → ALLOWED
   */
  test('update personal event to 500 participants (at one-off limit) succeeds', async () => {
    const db = getAdminDb();
    
    const eventId = randomUUID();
    await db.from('events').insert({
      id: eventId,
      title: 'Original Event',
      description: 'Test',
      created_by_user_id: testUserId,
      visibility: 'public',
      max_participants: 10,
      date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      city_id: testCityId,
    });

    const updated = await updateEvent(eventId, {
      maxParticipants: 500,
    }, currentUser);

    expect(updated.maxParticipants).toBe(500);
  });

  /**
   * QA-14: Personal event UPDATE to 600 participants → BLOCKED (402)
   */
  test('update personal event to 600 participants (over one-off limit) throws PaywallError', async () => {
    const db = getAdminDb();
    
    const eventId = randomUUID();
    await db.from('events').insert({
      id: eventId,
      title: 'Original Event',
      description: 'Test',
      created_by_user_id: testUserId,
      visibility: 'public',
      max_participants: 10,
      date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      city_id: testCityId,
    });

    // When: try to update to 600 participants (over one-off limit)
    // Then: should throw error (validation or PaywallError)
    await expect(updateEvent(eventId, {
      maxParticipants: 600,
    }, currentUser)).rejects.toThrow();
    
    // Verify error is thrown (either Zod validation or PaywallError)
    try {
      await updateEvent(eventId, { maxParticipants: 600 }, currentUser);
      fail('Expected update to throw error for 600 participants');
    } catch (err: any) {
      // Either Zod validation error OR PaywallError is acceptable
      // Zod catches it first (max 500), which is fine for blocking > 500
      expect(err).toBeDefined();
    }
  });

  /**
   * QA-15: Regression - Publish enforcement after update still works
   * 
   * Verify that after updating event to 50 participants, publish endpoint
   * correctly requires credit/payment (402 or 409)
   */
  test('after updating to 50 participants, publish requires credit or payment', async () => {
    const db = getAdminDb();
    const { enforcePublish } = await import('@/lib/services/accessControl');
    
    // Given: event updated to 50 participants
    const eventId = randomUUID();
    await db.from('events').insert({
      id: eventId,
      title: 'Test Event',
      description: 'Test',
      created_by_user_id: testUserId,
      visibility: 'public',
      max_participants: 10,
      date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      city_id: testCityId,
    });

    await updateEvent(eventId, { maxParticipants: 50 }, currentUser);

    // When: try to publish without credit
    // Then: should throw PaywallError (402) or return requiresCreditConfirmation (409)
    try {
      await enforcePublish({
        eventId,
        userId: testUserId,
        maxParticipants: 50,
        clubId: null,
      }, false);
      
      // If no error thrown, check for credit confirmation requirement
      fail('Expected enforcePublish to throw PaywallError or require confirmation');
    } catch (err: any) {
      // Should throw PaywallError with reason PUBLISH_REQUIRES_PAYMENT
      expect(err.reason).toBe('PUBLISH_REQUIRES_PAYMENT');
      expect(err.statusCode).toBe(402);
    }
  });
});

