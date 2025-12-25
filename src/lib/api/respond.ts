/**
 * API Response Helpers
 * 
 * Standardized response format for API routes
 */

import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    [key: string]: unknown;
  };
}

/**
 * Return success response (200)
 */
export function respondSuccess<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

/**
 * Return error response with custom status code
 */
export function respondError(
  status: number,
  error: { code: string; message: string; [key: string]: unknown }
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

