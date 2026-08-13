
import type { Response } from "express";
import { ApiResponse } from "../http/ApiResponse";
import type { AuthenticatedRequest } from "../middleware/AuthMiddleware";
import { OperatorService } from "../services/OperatorService";
import { parseZodError } from "../utils/validation";

export class OperatorController {
  constructor(private readonly operatorService = new OperatorService()) {}

  dashboard = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.operatorService.dashboard());

  drivers = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.operatorService.drivers());

  dispatchers = async (_req: AuthenticatedRequest, res: Response) => ApiResponse.ok(res, await this.operatorService.dispatchers());

  matchedDrivers = async (req: AuthenticatedRequest, res: Response) => {
    const drivers = await this.operatorService.matchedDrivers(String(req.params.id));
    if (!drivers) return ApiResponse.fail(res, "Yük tapılmadı.", 404);
    return ApiResponse.ok(res, drivers);
  };

  matchedDispatchers = async (req: AuthenticatedRequest, res: Response) => {
    const dispatchers = await this.operatorService.matchedDispatchers(String(req.params.id));
    if (!dispatchers) return ApiResponse.fail(res, "Yük tapılmadı.", 404);
    return ApiResponse.ok(res, dispatchers);
  };

  contactAttempt = async (req: AuthenticatedRequest, res: Response) => {
    try {
      return ApiResponse.ok(res, await this.operatorService.recordContact(String(req.params.id), req.body, req.user!), 201);
    } catch (error) {
      return ApiResponse.fail(res, "Əlaqə cəhdi saxlanılmadı.", 400, parseZodError(error));
    }
  };

  action = (status: string) => async (req: AuthenticatedRequest, res: Response) => {
    return ApiResponse.ok(res, await this.operatorService.setStatus(String(req.params.id), status, req.user!));
  };

  assignDriver = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.body.driverId) return ApiResponse.fail(res, "Sürücü seçilməlidir.", 400);
    return ApiResponse.ok(res, await this.operatorService.assignDriver(String(req.params.id), req.body.driverId, Boolean(req.body.confirm), req.user!));
  };

  assignDispatcher = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.body.dispatcherId) return ApiResponse.fail(res, "Dispetçer seçilməlidir.", 400);
    return ApiResponse.ok(res, await this.operatorService.assignDispatcher(String(req.params.id), req.body.dispatcherId, Boolean(req.body.confirm), req.user!));
  };
}
