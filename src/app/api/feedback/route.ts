/**
 * POST /api/feedback
 *
 * Submit user feedback (idea, bug, general feedback).
 *
 * API-ID: API-069
 * Auth: Authenticated users only (resolveCurrentUser)
 * Rate limit: middleware write tier (10/min) + handler-level 3/24h per user
 *
 * ARCHITECTURE:
 * - Auth via resolveCurrentUser(request) (ADR-001)
 * - Suspended users → automatic 403 USER_SUSPENDED (built into resolveCurrentUser)
 * - Business logic delegated to feedbackService.submitFeedback()
 * - Telemetry: fire-and-forget via abuseTelemetry
 *
 * @see docs/ssot/SSOT_API.md — API-069
 * @see src/lib/services/feedbackService.ts
 */

import { NextRequest } from 'next/server';
import { resolveCurrentUser } from '@/lib/auth/resolveCurrentUser';
import { respondSuccess, respondError } from '@/lib/api/response';
import { UnauthorizedError, ValidationError } from '@/lib/errors';
import { submitFeedback } from '@/lib/services/feedbackService';
import { trackUserMetric, trackWriteAction } from '@/lib/telemetry/abuseTelemetry';
import type { SubmitFeedbackPayload } from '@/lib/services/feedbackService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // =========================================================================
    // 1. Auth — resolveCurrentUser (ADR-001)
    //    Suspended users throw UserSuspendedError (403) automatically
    // =========================================================================
    const user = await resolveCurrentUser(request);
    if (!user) {
      return respondError(new UnauthorizedError());
    }

    // =========================================================================
    // 2. Parse request body
    // =========================================================================
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return respondError(new ValidationError('Invalid JSON body'));
    }

    // =========================================================================
    // 3. Build payload (capture user_agent server-side)
    // =========================================================================
    const payload: SubmitFeedbackPayload = {
      type: body.type as SubmitFeedbackPayload['type'],
      message: body.message as string,
      pagePath: typeof body.pagePath === 'string' ? body.pagePath : undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    };

    // =========================================================================
    // 4. Submit via service layer
    // =========================================================================
    const result = await submitFeedback(user.id, payload);

    // =========================================================================
    // 5. Handle result + telemetry
    // =========================================================================
    if (result.ok) {
      // Fire-and-forget telemetry
      trackWriteAction(user.id, 'feedback.submit');

      return respondSuccess({ id: result.id }, 'Feedback submitted', 201);
    }

    // Rejection cases — fire-and-forget telemetry for each
    switch (result.reason) {
      case 'rate_limit':
        trackUserMetric(user.id, 'feedback.rejected.rate_limit');
        return respondSuccess(
          undefined,
          'Too many feedback submissions. Please try again later.',
          200,
        );

      case 'validation':
        trackUserMetric(user.id, 'feedback.rejected.validation');
        return respondError(new ValidationError(result.detail));

      case 'dedupe':
        trackUserMetric(user.id, 'feedback.rejected.dedupe');
        // Silent 200 OK — do not reveal dedup to client
        return respondSuccess(undefined, 'Feedback submitted', 200);
    }
  } catch (error) {
    return respondError(error);
  }
}
