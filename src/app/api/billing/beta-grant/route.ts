/**
 * POST /api/billing/beta-grant
 *
 * System auto-grant endpoint for SOFT_BETA_STRICT mode.
 * Grants exactly one EVENT_UPGRADE_500 credit with source='system'.
 *
 * Guards:
 * - Requires authentication
 * - Requires PAYWALL_MODE=soft_beta_strict
 *
 * @see BETA_SOFT_STRICT_DELTA_REPORT.md §3.2
 * @see UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md §7.1
 */

import { NextRequest } from 'next/server';
import { respondSuccess, respondError } from '@/lib/api/response';
import { getCurrentUserFromMiddleware } from '@/lib/auth/currentUser';
import { UnauthorizedError } from '@/lib/errors';
import { betaGrantOneOffCredit } from '@/lib/billing/betaGrant';
import type { CreditCode } from '@/lib/types/billing';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const currentUser = await getCurrentUserFromMiddleware(request);
    if (!currentUser) {
      throw new UnauthorizedError('Авторизация обязательна');
    }

    // 2. Grant system credit
    // betaGrantOneOffCredit internally checks PAYWALL_MODE=soft_beta_strict
    const result = await betaGrantOneOffCredit({
      userId: currentUser.id,
      creditCode: 'EVENT_UPGRADE_500' as CreditCode,
      reason: 'BETA_AUTO_GRANT_CREATE_PAID_EVENT',
    });

    return respondSuccess(
      {
        creditId: result.credit.id,
        transactionId: result.transactionId,
      },
      'Beta credit granted',
      200
    );
  } catch (err) {
    return respondError(err);
  }
}
