// Postgres / PostgREST / Edge Function xatolarini bir xil ko‘rinishga keltiradi.
export type ApiErrorCode =
  | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION"
  | "CONFLICT" | "ADMIN_EXISTS" | "INTERNAL";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: unknown;
  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

interface PgLikeError { code?: string; message?: string; details?: string | null }

export function fromPostgrestError(err: PgLikeError): ApiError {
  const message = err.message ?? "Noma‘lum xato";
  switch (err.code) {
    case "28000": return new ApiError("UNAUTHENTICATED", message);
    case "42501": return new ApiError("FORBIDDEN", message);
    case "P0002": return new ApiError("NOT_FOUND", message);
    case "22023": case "23514": case "22P02": case "22007": return new ApiError("VALIDATION", message);
    case "23505": return new ApiError("CONFLICT", message);
    case "23503": return new ApiError("CONFLICT", message);
    case "P0001": return new ApiError("CONFLICT", message);
    default: return new ApiError("INTERNAL", message, err.details ?? undefined);
  }
}

export function unwrap<T>(res: { data: T | null; error: PgLikeError | null }): T {
  if (res.error) throw fromPostgrestError(res.error);
  if (res.data === null) throw new ApiError("NOT_FOUND", "Ma‘lumot topilmadi");
  return res.data;
}
