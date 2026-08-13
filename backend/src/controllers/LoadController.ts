
import type { Response } from "express";
import z from "zod";
import { LoadStatus } from "@prisma/client";
import { ApiResponse } from "../http/ApiResponse";
import type { AuthenticatedRequest } from "../middleware/AuthMiddleware";
import { LoadService } from "../services/LoadService";
import { parseZodError } from "../utils/validation";

export class LoadController {
  constructor(private readonly loadService = new LoadService()) {}

  list = async (req: AuthenticatedRequest, res: Response) => {
    return ApiResponse.ok(res, await this.loadService.list(req.user!));
  };

  get = async (req: AuthenticatedRequest, res: Response) => {
    const load = await this.loadService.get(String(req.params.id), req.user!);
    if (!load) return ApiResponse.fail(res, "Yük tapılmadı.", 404);
    return ApiResponse.ok(res, load);
  };

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const load = await this.loadService.create(req.body, req.user!);
      return ApiResponse.ok(res, load, 201);
    } catch (error) {
      return ApiResponse.fail(res, error instanceof Error ? error.message : "Yük məlumatlarını yoxlayın.", 400, parseZodError(error));
    }
  };

  updateStatus = async (req: AuthenticatedRequest, res: Response) => {
    const parsedStatus = z.nativeEnum(LoadStatus).safeParse(req.body.status);
    if (!parsedStatus.success) {
      return ApiResponse.fail(res, "Status düzgün deyil.", 400);
    }

    const load = await this.loadService.update(String(req.params.id), { status: parsedStatus.data }, req.user!);
    return ApiResponse.ok(res, load);
  };

  updateNote = async (req: AuthenticatedRequest, res: Response) => {
    const load = await this.loadService.update(String(req.params.id), { operatorNote: req.body.operatorNote || null }, req.user!);
    return ApiResponse.ok(res, load);
  };
}
