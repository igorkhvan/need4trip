import { NextResponse } from "next/server";
import { isAppError, isPaywallError, type AppError, type PaywallError } from "@/lib/errors";

/**
 * API Response Types
 */
export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data?: T;
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Return standardized success response
 * 
 * @param data - Response data
 * @param message - Optional message
 * @param status - HTTP status code (default: 200)
 * @param headers - Optional custom headers (e.g. Cache-Control)
 */
export function respondSuccess<T>(
  data?: T,
  message?: string,
  status: number = 200,
  headers?: Record<string, string>
): NextResponse<ApiSuccessResponse<T>> {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    message,
  };
  
  const response = NextResponse.json(payload, { status });
  
  // Apply custom headers if provided
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

/**
 * Alias for respondSuccess (backward compatibility)
 */
export const respondJSON = respondSuccess;

/**
 * Return standardized error response
 */
export function respondError(
  error: AppError | Error | unknown,
  fallbackMessage: string = "Internal Server Error"
): NextResponse<ApiErrorResponse> {
  // Special handling for PaywallError (402 Payment Required)
  if (isPaywallError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.toJSON(), // Include full paywall payload
        },
      },
      { status: 402 }
    );
  }

  if (isAppError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "InternalError",
          message: error.message || fallbackMessage,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "InternalError",
        message: fallbackMessage,
      },
    },
    { status: 500 }
  );
}
