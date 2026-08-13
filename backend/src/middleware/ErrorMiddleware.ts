import type { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../http/ApiResponse";

export class ErrorMiddleware {
  static notFound(req: Request, res: Response) {
    ApiResponse.fail(res, `${req.method} ${req.path} tapılmadı.`, 404);
  }

  static handle(error: unknown, _req: Request, res: Response, _next: NextFunction) {
    void _next;
    const message = error instanceof Error ? error.message : "Server xətası.";
    ApiResponse.fail(res, message, 500);
  }
}
