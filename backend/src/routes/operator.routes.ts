import { Router } from "express";

import { OperatorController } from "../controllers/OperatorController";
import { asyncHandler } from "../http/asyncHandler";
import { AuthMiddleware } from "../middleware/AuthMiddleware";

const router = Router();
const controller = new OperatorController();

router.get("/operator/dashboard", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(controller.dashboard));
router.get("/operator/drivers", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(controller.drivers));
router.get("/operator/dispatchers", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(controller.dispatchers));

router.get("/drivers", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(controller.drivers));
router.get("/dispatchers", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(controller.dispatchers));

export { router as operatorRoutes };
