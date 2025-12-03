import { ZodError } from "zod";

import { AppError, ValidationError, isAppError } from "@/lib/errors";

export function respondJSON<T>(data: T, init?: number | ResponseInit) {
  const headers = new Headers(
    typeof init === "object" && init?.headers ? init.headers : undefined
  );
  headers.set("Content-Type", "application/json; charset=utf-8");
  const responseInit =
    typeof init === "number" ? { status: init, headers } : { ...init, headers };
  return new Response(JSON.stringify(data), responseInit);
}

export function respondError(err: unknown) {
  if (err instanceof ZodError) {
    const valErr = new ValidationError("Validation failed", err.flatten());
    return respondJSON(
      { error: valErr.code, message: valErr.message, details: valErr.details },
      valErr.statusCode
    );
  }
  if (isAppError(err)) {
    return respondJSON(
      {
        error: err.code,
        message: err.message,
        details: err.details,
      },
      err.statusCode
    );
  }
  console.error("Unhandled error", err);
  const internal: AppError =
    err instanceof Error
      ? new AppError(err.message, { statusCode: 500, code: "InternalError" })
      : new AppError("Unexpected server error", { statusCode: 500, code: "InternalError" });
  return respondJSON(
    { error: internal.code, message: "Unexpected server error" },
    internal.statusCode
  );
}
