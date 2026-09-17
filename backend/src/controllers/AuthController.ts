import type { Request, Response } from "express";
import { config } from "../config";
import { ApiResponse } from "../http/ApiResponse";
import type { AuthenticatedRequest } from "../middleware/AuthMiddleware";
import { AuthService } from "../services/AuthService";
import { publicUser } from "../utils/auth";
import { parseZodError } from "../utils/validation";

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);
      this.setAuthCookie(res, result.token);
      return ApiResponse.ok(res, { redirectTo: result.redirectTo, user: result.user });
    } catch (error) {
      return ApiResponse.fail(res, error instanceof Error ? error.message : "Giriş alınmadı.", 401, parseZodError(error));
    }
  };

  register = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.register(req.body);
      this.setAuthCookie(res, result.token);
      return ApiResponse.ok(res, { redirectTo: result.redirectTo, user: result.user }, 201);
    } catch (error) {
      return ApiResponse.fail(res, "Qeydiyyat məlumatlarını yoxlayın.", 400, parseZodError(error));
    }
  };

  registerCargoOwner = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.registerCargoOwner(req.body);
      this.setAuthCookie(res, result.token);
      return ApiResponse.ok(res, { redirectTo: result.redirectTo, user: result.user }, 201);
    } catch (error) {
      return ApiResponse.fail(res, "Qeydiyyat məlumatlarını yoxlayın.", 400, parseZodError(error));
    }
  };

  registerDriver = async (req: Request, res: Response) => {
    try {
      return ApiResponse.ok(res, await this.authService.registerDriver(req.body), 201);
    } catch (error) {
      return ApiResponse.fail(res, error instanceof Error ? error.message : "Sürücü qeydiyyat məlumatlarını yoxlayın.", 400, parseZodError(error));
    }
  };

  registerDispatcher = async (req: Request, res: Response) => {
    try {
      return ApiResponse.ok(res, await this.authService.registerDispatcher(req.body), 201);
    } catch (error) {
      return ApiResponse.fail(res, error instanceof Error ? error.message : "Dispetçer qeydiyyat məlumatlarını yoxlayın.", 400, parseZodError(error));
    }
  };

  me = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return ApiResponse.fail(res, "Giriş tələb olunur.", 401);
    }

    return ApiResponse.ok(res, { user: publicUser(req.user) });
  };

  logout = async (_req: Request, res: Response) => {
    res.cookie(config.authCookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });

    return ApiResponse.ok(res, { loggedOut: true });
  };

  private setAuthCookie(res: Response, token: string) {
    res.cookie(config.authCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
  }
}
