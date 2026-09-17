import type { NextFunction, Request, Response } from "express";

import type { User } from "@prisma/client";
import { ApiResponse } from "../http/ApiResponse";
import { prisma } from "../prisma";
import { config } from "../config";
import { verifyAuthToken } from "../utils/auth";

export type BackendUser = User & {
  carrierProfile?: unknown;
  cargoOwnerProfile?: unknown;
  driverProfile?: unknown;
  dispatcherProfile?: unknown;
};

export type AuthenticatedRequest = Request & {
  user?: BackendUser;
};

export class AuthMiddleware {
  static async optional(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const token = AuthMiddleware.extractToken(req);

    if (!token) {
      next();
      return;
    }

    try {
      const payload = await verifyAuthToken(decodeURIComponent(token));
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          carrierProfile: true,
          cargoOwnerProfile: true,
          driverProfile: true,
          dispatcherProfile: true
        }
      });

      if (user) {
        req.user = user;
      }
    } catch {
      // Optional auth intentionally ignores invalid tokens.
    }

    next();
  }

  static require(roles?: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      await AuthMiddleware.optional(req, res, async () => undefined);

      if (!req.user) {
        ApiResponse.fail(res, "Giriş tələb olunur.", 401);
        return;
      }

      if (req.user.status === "BLOCKED") {
        ApiResponse.fail(res, "Hesabınız bloklanıb.", 403);
        return;
      }

      if (roles && !roles.includes(req.user.role)) {
        ApiResponse.fail(res, "Bu əməliyyat üçün icazəniz yoxdur.", 403);
        return;
      }

      next();
    };
  }

  private static extractToken(req: Request) {
    const cookies = req.cookies as Record<string, string> | undefined;

    if (cookies?.[config.authCookieName]) {
      return cookies[config.authCookieName];
    }

    const authorization = req.headers.authorization;
    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length);
    }

    return undefined;
  }
}
