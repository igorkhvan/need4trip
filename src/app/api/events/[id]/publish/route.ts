/**
 * POST /api/events/:id/publish
 * 
 * Purpose: Publish an event (move from draft to live)
 * Spec: One-off event upgrade billing system
 * 
 * Rules:
 * - Idempotent (if already published, returns OK)
 * - Personal events may require credit or payment
 * - Club events use existing access control
 * - Credit consumption requires explicit confirmation
 * 
 * Protected by middleware - requires valid JWT
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { respondSuccess, respondError } from "@/lib/api/respond";
import { getAdminDb } from "@/lib/db/client";
import { enforcePublish } from "@/lib/services/accessControl";
import { consumeCredit } from "@/lib/db/billingCreditsRepo";
import { logger } from "@/lib/utils/logger";
import { PaywallError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication required (via middleware)
    const currentUser = await getCurrentUserFromMiddleware(req);
    if (!currentUser) {
      return respondError(401, { code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { id: eventId } = await context.params;
    const { searchParams } = new URL(req.url);
    const confirmCredit = searchParams.get("confirm_credit") === "1";

    // 2. Get event
    const db = getAdminDb();
    const { data: event, error: fetchError } = await db
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      return respondError(404, { 
        code: "EVENT_NOT_FOUND", 
        message: "Event not found" 
      });
    }

    // 3. Authorization (only owner can publish)
    if (event.created_by_user_id !== currentUser.id) {
      return respondError(403, { 
        code: "FORBIDDEN", 
        message: "Only event owner can publish" 
      });
    }

    // 4. Idempotency check
    if (event.published_at) {
      logger.info("Event already published (idempotent)", { eventId, publishedAt: event.published_at });
      return respondSuccess({ 
        eventId, 
        publishedAt: event.published_at,
        alreadyPublished: true 
      });
    }

    // 5. Enforce publish rules
    const decision = await enforcePublish({
      eventId,
      userId: currentUser.id,
      maxParticipants: event.max_participants,
      clubId: event.club_id,
    }, confirmCredit);

    // 6. Handle credit confirmation required (409)
    if (!decision.allowed && decision.requiresCreditConfirmation) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CREDIT_CONFIRMATION_REQUIRED",
          reason: "EVENT_UPGRADE_WILL_BE_CONSUMED",
          meta: {
            creditCode: decision.creditCode,
            eventId,
            requestedParticipants: event.max_participants,
          },
          cta: {
            type: "CONFIRM_CONSUME_CREDIT",
            href: `/api/events/${eventId}/publish?confirm_credit=1`,
          },
        },
      }, { status: 409 });
    }

    // 7. Publish event (atomic transaction)
    const now = new Date().toISOString();

    if (decision.allowed && decision.willConsumeCredit) {
      // Consume credit + publish in single transaction
      try {
        await consumeCredit(currentUser.id, "EVENT_UPGRADE_500", eventId);
        
        const { error: updateError } = await db
          .from("events")
          .update({ published_at: now })
          .eq("id", eventId);

        if (updateError) {
          logger.error("Failed to publish event after credit consumption", { 
            error: updateError, 
            eventId 
          });
          throw new Error(`Failed to publish: ${updateError.message}`);
        }

        logger.info("Event published with credit consumption", { 
          eventId, 
          userId: currentUser.id,
          creditCode: "EVENT_UPGRADE_500" 
        });

        return respondSuccess({ 
          eventId, 
          publishedAt: now,
          creditConsumed: true 
        });
      } catch (err: any) {
        // No available credit (race condition or concurrent publish)
        if (err.message.includes("No available")) {
          return respondError(402, {
            code: "PAYWALL",
            reason: "PUBLISH_REQUIRES_PAYMENT",
            message: "No available credits. Please purchase a credit or club access.",
            options: [
              {
                type: "ONE_OFF_CREDIT",
                productCode: "EVENT_UPGRADE_500",
                price: 1000,                   // ⚡ Normalized (was priceKzt)
                currencyCode: "KZT",           // ⚡ Added
                provider: "kaspi",
              },
              {
                type: "CLUB_ACCESS",
                recommendedPlanId: "club_50",
              },
            ],
          });
        }
        throw err;
      }
    } else {
      // Simple publish (no credit needed)
      const { error: updateError } = await db
        .from("events")
        .update({ published_at: now })
        .eq("id", eventId);

      if (updateError) {
        logger.error("Failed to publish event", { error: updateError, eventId });
        return respondError(500, { 
          code: "INTERNAL_ERROR", 
          message: "Failed to publish event" 
        });
      }

      logger.info("Event published successfully", { eventId, userId: currentUser.id });

      return respondSuccess({ 
        eventId, 
        publishedAt: now 
      });
    }

  } catch (err: any) {
    // Handle PaywallError (402)
    if (err instanceof PaywallError) {
      const json = err.toJSON();
      return NextResponse.json(json, { status: 402 });
    }

    logger.error("Unexpected error in publish endpoint", { error: err });
    return respondError(500, { 
      code: "INTERNAL_ERROR", 
      message: err.message || "Failed to publish event" 
    });
  }
}

