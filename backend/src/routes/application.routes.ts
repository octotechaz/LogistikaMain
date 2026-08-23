import { Router } from "express";

import { ApplicationController } from "../controllers/ApplicationController";
import { asyncHandler } from "../http/asyncHandler";
import { AuthMiddleware } from "../middleware/AuthMiddleware";

const router = Router();
const controller = new ApplicationController();

router.get("/applications", AuthMiddleware.require(["CARRIER", "CARGO_OWNER", "ADMIN"]), asyncHandler(controller.list));
router.post("/applications", AuthMiddleware.require(["CARRIER"]), asyncHandler(controller.create));
router.patch("/applications/:id", AuthMiddleware.require(["CARGO_OWNER"]), asyncHandler(controller.decide));
router.post("/applications/:id", AuthMiddleware.require(["CARGO_OWNER"]), asyncHandler(controller.decide));

export { router as applicationRoutes };
