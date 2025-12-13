import { NextResponse } from "next/server";
import { isAppError, type AppError } from "@/lib/errors";

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
 */
export function respondSuccess<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

/**
 * Return standardized error response
 */
export function respondError(
  error: AppError | Error | unknown,
  fallbackMessage: string = "Internal Server Error"
): NextResponse<ApiErrorResponse> {
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
