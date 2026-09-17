
import type { Request, Response } from "express";
import { UserStatus, VehicleStatus } from "@prisma/client";
import { z } from "zod";
import { ApiResponse } from "../http/ApiResponse";
import type { AuthenticatedRequest } from "../middleware/AuthMiddleware";
import { AdminService } from "../services/AdminService";
import { parseZodError } from "../utils/validation";

export class AdminController {
  constructor(private readonly adminService = new AdminService()) {}

  dashboard = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.adminService.dashboard());
  users = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.adminService.users());
  loads = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.adminService.loads());
  vehicles = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.adminService.vehicles());
  cargoPosts = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.adminService.cargoPosts());
  operators = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.adminService.operators());
  statistics = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.adminService.statistics());

  updateUserStatus = async (req: AuthenticatedRequest, res: Response) => {
    const parsed = z.nativeEnum(UserStatus).safeParse(req.body.status ?? req.body._status);
    if (!parsed.success) return ApiResponse.fail(res, "Status düzgün deyil.", 400);
    return ApiResponse.ok(res, await this.adminService.updateUserStatus(String(req.params.id), parsed.data, req.user!.id));
  };

  updateVehicleStatus = async (req: AuthenticatedRequest, res: Response) => {
    const parsed = z.nativeEnum(VehicleStatus).safeParse(req.body.status);
    if (!parsed.success) return ApiResponse.fail(res, "Status düzgün deyil.", 400);
    return ApiResponse.ok(res, await this.adminService.updateVehicleStatus(String(req.params.id), parsed.data, req.user!.id));
  };

  publicCategories = async (_req: Request, res: Response) => ApiResponse.ok(res, await this.adminService.publicCategories(true));

  savePublicCategory = async (req: Request, res: Response) => {
    try {
      return ApiResponse.ok(res, await this.adminService.savePublicCategory(req.body), 201);
    } catch (error) {
      return ApiResponse.fail(res, "Kateqoriya saxlanılmadı.", 400, parseZodError(error));
    }
  };

  deletePublicCategory = async (req: Request, res: Response) => {
    const id = String(req.query.id || req.params.id || "");
    if (!id) return ApiResponse.fail(res, "Kateqoriya ID tələb olunur.", 400);
    return ApiResponse.ok(res, await this.adminService.deletePublicCategory(id));
  };
}
