import { Router } from "express";

import { AdminController } from "../controllers/AdminController";
import { asyncHandler } from "../http/asyncHandler";
import { AuthMiddleware } from "../middleware/AuthMiddleware";

const router = Router();
const controller = new AdminController();
const adminOnly = AuthMiddleware.require(["ADMIN"]);

router.get("/admin/dashboard", adminOnly, asyncHandler(controller.dashboard));
router.get("/admin/users", adminOnly, asyncHandler(controller.users));
router.patch("/admin/users/:id/status", adminOnly, asyncHandler(controller.updateUserStatus));
router.post("/admin/users/:id/status", adminOnly, asyncHandler(controller.updateUserStatus));
router.get("/admin/loads", adminOnly, asyncHandler(controller.loads));
router.get("/admin/vehicles", adminOnly, asyncHandler(controller.vehicles));
router.post("/admin/vehicles/:id/status", adminOnly, asyncHandler(controller.updateVehicleStatus));
router.patch("/admin/vehicles/:id/status", adminOnly, asyncHandler(controller.updateVehicleStatus));
router.get("/admin/cargo-posts", adminOnly, asyncHandler(controller.cargoPosts));
router.get("/admin/operators", adminOnly, asyncHandler(controller.operators));
router.get("/admin/statistics", adminOnly, asyncHandler(controller.statistics));
router.get("/admin/public-categories", adminOnly, asyncHandler(controller.publicCategories));
router.post("/admin/public-categories", adminOnly, asyncHandler(controller.savePublicCategory));
router.delete("/admin/public-categories", adminOnly, asyncHandler(controller.deletePublicCategory));
router.delete("/admin/public-categories/:id", adminOnly, asyncHandler(controller.deletePublicCategory));

export { router as adminRoutes };
