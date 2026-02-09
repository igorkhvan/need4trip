/**
 * Admin API: Change User Account Status
 * 
 * Suspend or unsuspend a user account via admin action.
 * WRITE operation — uses adminAtomicMutation for audit logging.
 * 
 * Auth: resolveAdminContext() (user-session + email allowlist OR x-admin-secret)
 * NOT in middleware ADMIN_ROUTES — follows grant-credit pattern.
 * 
 * @see SSOT_API.md API-068
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";
import { getUserById, updateUserStatus } from "@/lib/db/userRepo";
import { adminAtomicMutation, logAdminValidationRejection } from "@/lib/audit/adminAtomic";
import { log } from "@/lib/utils/logger";
import type { UserStatus } from "@/lib/types/user";

export const dynamic = "force-dynamic";

const VALID_STATUSES: UserStatus[] = ['active', 'suspended'];

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * POST /api/admin/users/:userId/status
 * 
 * Body:
 * - status: 'active' | 'suspended'
 * - reason: string (mandatory, human-readable justification)
 * 
 * Returns: previous/new status + audit record id
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  // =========================================================================
  // 1. Resolve Admin Context (MANDATORY)
  // =========================================================================
  const adminContext = await resolveAdminContext(request);

  if (!adminContext) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Invalid admin credentials",
        },
      },
      { status: 403 }
    );
  }

  // =========================================================================
  // 2. Validate userId
  // =========================================================================
  const { userId } = await context.params;

  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "userId is required",
        },
      },
      { status: 400 }
    );
  }

  // =========================================================================
  // 3. Parse and validate body
  // =========================================================================
  let body: { status?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
        },
      },
      { status: 400 }
    );
  }

  const { status, reason } = body;

  // Validate status
  if (!status || typeof status !== "string" || !VALID_STATUSES.includes(status as UserStatus)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        },
      },
      { status: 400 }
    );
  }

  // Validate reason
  if (!reason || typeof reason !== "string" || (reason as string).trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "reason is required and must be a non-empty string",
        },
      },
      { status: 400 }
    );
  }

  const newStatus = status as UserStatus;
  const trimmedReason = (reason as string).trim();

  // =========================================================================
  // 4. Load user and check current status
  // =========================================================================
  try {
    const user = await getUserById(userId);

    if (!user) {
      await logAdminValidationRejection({
        adminContext,
        actionType: "ADMIN_USER_STATUS_CHANGE_REJECTED",
        target: { type: "user", id: userId },
        reason: trimmedReason,
        errorCode: "USER_NOT_FOUND",
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    // Idempotent: if status already matches, return success without mutation
    if (user.status === newStatus) {
      return NextResponse.json({
        success: true,
        data: {
          previousStatus: user.status,
          newStatus,
          changed: false,
        },
        message: `User status is already '${newStatus}'`,
      });
    }

    // =========================================================================
    // 5. Execute atomic mutation + audit log
    // =========================================================================
    const previousStatus = user.status;

    const result = await adminAtomicMutation({
      adminContext,
      actionType: "ADMIN_USER_STATUS_CHANGED",
      target: { type: "user", id: userId },
      reason: trimmedReason,
      mutation: async () => {
        const updated = await updateUserStatus(userId, newStatus);
        return { data: updated };
      },
      rollback: async () => {
        // Compensating action: revert to previous status
        await updateUserStatus(userId, previousStatus);
      },
      metadata: {
        previousStatus,
        newStatus,
      },
    });

    log.info("[Admin/UserStatus] Status changed", {
      userId,
      previousStatus,
      newStatus,
      auditId: result.auditRecord.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        previousStatus,
        newStatus,
        changed: true,
        auditId: result.auditRecord.id,
      },
      message: `User status changed from '${previousStatus}' to '${newStatus}'`,
    });
  } catch (err) {
    log.error("[Admin/UserStatus] Service error", {
      userId,
      newStatus,
      error: err instanceof Error ? err.message : "Unknown error",
    });

    const message = err instanceof Error ? err.message : "Failed to change user status";

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
