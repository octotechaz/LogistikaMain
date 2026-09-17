import type { Response } from "express";
import { ApiResponse } from "../http/ApiResponse";
import type { AuthenticatedRequest } from "../middleware/AuthMiddleware";
import { VehicleService } from "../services/VehicleService";
import { parseZodError } from "../utils/validation";

export class VehicleController {
  constructor(private readonly vehicleService = new VehicleService()) {}

  list = async (req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.vehicleService.list(req.user!));

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      return ApiResponse.ok(res, await this.vehicleService.create(req.body, req.user!), 201);
    } catch (error) {
      return ApiResponse.fail(res, error instanceof Error ? error.message : "Avtomobil saxlanılmadı.", 400, parseZodError(error));
    }
  };

  update = async (req: AuthenticatedRequest, res: Response) => {
    try {
      return ApiResponse.ok(res, await this.vehicleService.update(String(req.params.id), req.body, req.user!));
    } catch (error) {
      return ApiResponse.fail(res, error instanceof Error ? error.message : "Avtomobil yenilənmədi.", 400, parseZodError(error));
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response) => {
    try {
      return ApiResponse.ok(res, await this.vehicleService.delete(String(req.params.id), req.user!));
    } catch (error) {
      return ApiResponse.fail(res, error instanceof Error ? error.message : "Avtomobil silinmədi.", 400);
    }
  };
}
