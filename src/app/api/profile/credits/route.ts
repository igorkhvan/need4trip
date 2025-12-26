/**
 * API: /api/profile/credits
 * 
 * GET - Получить детальную информацию о credits (available + consumed history)
 */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { respondSuccess, respondError } from "@/lib/api/response";
import { AuthError } from "@/lib/errors";
import { getAdminDb } from "@/lib/db/client";
import type { BillingCredit } from "@/lib/types/billing";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/credits
 * Получить available и consumed credits с деталями
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new AuthError("Необходима авторизация");
    }

    const db = getAdminDb();

    // Fetch available credits
    const { data: availableData, error: availableError } = await db
      .from("billing_credits")
      .select(`
        *,
        source_transaction:billing_transactions!source_transaction_id(
          id,
          product_code,
          amount,
          currency_code,
          status,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "available")
      .order("created_at", { ascending: true });

    if (availableError) {
      throw new Error(`Failed to fetch available credits: ${availableError.message}`);
    }

    // Fetch consumed credits with event details
    const { data: consumedData, error: consumedError } = await db
      .from("billing_credits")
      .select(`
        *,
        consumed_event:events!consumed_event_id(
          id,
          title,
          start_date,
          max_participants
        ),
        source_transaction:billing_transactions!source_transaction_id(
          id,
          product_code,
          amount,
          currency_code
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "consumed")
      .order("consumed_at", { ascending: false })
      .limit(50); // Last 50 consumed credits

    if (consumedError) {
      throw new Error(`Failed to fetch consumed credits: ${consumedError.message}`);
    }

    // Map to domain types
    const available: BillingCredit[] = (availableData || []).map(mapDbRowToCredit);
    const consumed: BillingCredit[] = (consumedData || []).map(mapDbRowToCredit);

    return respondSuccess({
      available,
      consumed,
      count: {
        available: available.length,
        consumed: consumed.length,
        total: available.length + consumed.length,
      },
    });
  } catch (error) {
    return respondError(error);
  }
}

/**
 * Map DB row to BillingCredit domain type
 */
function mapDbRowToCredit(row: any): BillingCredit {
  return {
    id: row.id,
    userId: row.user_id,
    creditCode: row.credit_code,
    status: row.status,
    sourceTransactionId: row.source_transaction_id,
    consumedEventId: row.consumed_event_id ?? undefined,
    consumedAt: row.consumed_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Include related data if loaded
    ...(row.source_transaction && { sourceTransaction: row.source_transaction }),
    ...(row.consumed_event && { consumedEvent: row.consumed_event }),
  };
}

