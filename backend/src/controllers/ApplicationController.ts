
import z from "zod";
import type { Response } from "express";
import { ApplicationStatus } from "@prisma/client";
import { ApiResponse } from "../http/ApiResponse";
import type { AuthenticatedRequest } from "../middleware/AuthMiddleware";
import { ApplicationService } from "../services/ApplicationService";
import { parseZodError } from "../utils/validation";

export class ApplicationController {
  constructor(private readonly applicationService = new ApplicationService()) {}

  list = async (req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.applicationService.list(req.user!));

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      return ApiResponse.ok(res, await this.applicationService.create(req.body, req.user!), 201);
    } catch (error) {
      return ApiResponse.fail(res, "Müraciət məlumatlarını yoxlayın.", 400, parseZodError(error));
    }
  };

  decide = async (req: AuthenticatedRequest, res: Response) => {
    const status = String(req.body.status || "");
    const parsedStatus = z.nativeEnum(ApplicationStatus).safeParse(status);
    if (!parsedStatus.success) {
      return ApiResponse.fail(res, "Müraciət statusu düzgün deyil.", 400);
    }

    const updated = await this.applicationService.decide(String(req.params.id), parsedStatus.data, req.user!);
    if (!updated) return ApiResponse.fail(res, "Müraciət tapılmadı və ya icazəniz yoxdur.", 404);
    return ApiResponse.ok(res, updated);
  };
}
