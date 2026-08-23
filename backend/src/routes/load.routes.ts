import { Router } from "express";

import { LoadController } from "../controllers/LoadController";
import { OperatorController } from "../controllers/OperatorController";
import { asyncHandler } from "../http/asyncHandler";
import { AuthMiddleware } from "../middleware/AuthMiddleware";

const router = Router();
const loadController = new LoadController();
const operatorController = new OperatorController();

router.get("/loads", AuthMiddleware.require(["CARGO_OWNER", "OPERATOR", "ADMIN"]), asyncHandler(loadController.list));
router.post("/loads", AuthMiddleware.require(["CARGO_OWNER"]), asyncHandler(loadController.create));
router.get("/loads/:id", AuthMiddleware.require(["CARGO_OWNER", "OPERATOR", "ADMIN"]), asyncHandler(loadController.get));
router.patch("/loads/:id", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(loadController.updateStatus));
router.post("/loads/:id/contact-attempts", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(operatorController.contactAttempt));

router.get("/cargo-owner/loads", AuthMiddleware.require(["CARGO_OWNER"]), asyncHandler(loadController.list));
router.post("/cargo-owner/loads", AuthMiddleware.require(["CARGO_OWNER"]), asyncHandler(loadController.create));
router.get("/cargo-owner/loads/:id", AuthMiddleware.require(["CARGO_OWNER"]), asyncHandler(loadController.get));

router.get("/operator/loads", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(loadController.list));
router.get("/operator/loads/:id", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(loadController.get));
router.patch("/operator/loads/:id/status", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(loadController.updateStatus));
router.patch("/operator/loads/:id/note", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(loadController.updateNote));
router.post("/operator/loads/:id/contact-attempts", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(operatorController.contactAttempt));
router.get("/operator/loads/:id/matched-drivers", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(operatorController.matchedDrivers));
router.get("/operator/loads/:id/matched-dispatchers", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(operatorController.matchedDispatchers));
router.post("/operator/loads/:id/assign-driver", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(operatorController.assignDriver));
router.post("/operator/loads/:id/assign-dispatcher", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(operatorController.assignDispatcher));
router.post("/operator/loads/:id/confirm", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(operatorController.action("CONFIRMED")));
router.post("/operator/loads/:id/complete", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(operatorController.action("COMPLETED")));
router.post("/operator/loads/:id/cancel", AuthMiddleware.require(["OPERATOR", "ADMIN"]), asyncHandler(operatorController.action("CANCELLED")));

export { router as loadRoutes };
