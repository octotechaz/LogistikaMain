import { Router } from "express";

import { VehicleController } from "../controllers/VehicleController";
import { asyncHandler } from "../http/asyncHandler";
import { AuthMiddleware } from "../middleware/AuthMiddleware";

const router = Router();
const controller = new VehicleController();

router.get("/vehicles", AuthMiddleware.require(["CARRIER", "ADMIN"]), asyncHandler(controller.list));
router.post("/vehicles", AuthMiddleware.require(["CARRIER"]), asyncHandler(controller.create));
router.patch("/vehicles/:id", AuthMiddleware.require(["CARRIER", "ADMIN"]), asyncHandler(controller.update));
router.delete("/vehicles/:id", AuthMiddleware.require(["CARRIER", "ADMIN"]), asyncHandler(controller.delete));

export { router as vehicleRoutes };
