/**
 * Database Types
 * 
 * Raw database row types (snake_case) for direct Supabase queries.
 * Domain types are defined in their respective files (event.ts, club.ts, etc.)
 */

/**
 * idempotency_keys table
 * Used by withIdempotency service to prevent duplicate requests
 */
export interface DbIdempotencyKey {
  id: string;
  user_id: string;
  key: string;
  route: string;
  status: 'in_progress' | 'completed' | 'failed';
  response_status: number | null;
  response_body: any | null;
  created_at: string;
  updated_at: string;
}

