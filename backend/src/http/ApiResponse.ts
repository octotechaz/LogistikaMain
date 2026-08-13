import type { Response } from "express";

type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SERVER_ERROR"
  | "BAD_REQUEST";

function codeForStatus(status: number): ErrorCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status >= 500) return "SERVER_ERROR";
  return status === 400 ? "VALIDATION_ERROR" : "BAD_REQUEST";
}

export class ApiResponse {
  static ok<T>(res: Response, data: T, status = 200) {
    return res.status(status).json({ success: true, ok: true, data });
  }

  static fail(res: Response, message: string, status = 400, details?: unknown, code?: ErrorCode) {
    return res.status(status).json({
      success: false,
      ok: false,
      error: {
        code: code ?? codeForStatus(status),
        message
      },
      message,
      details
    });
  }
}
