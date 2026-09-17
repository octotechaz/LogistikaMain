import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { asyncHandler } from "../http/asyncHandler";
import { AuthMiddleware } from "../middleware/AuthMiddleware";

const router = Router();
const controller = new AuthController();

router.post("/login", asyncHandler(controller.login));
router.post("/logout", asyncHandler(controller.logout));
router.get("/me", AuthMiddleware.require(), asyncHandler(controller.me));
router.post("/register", asyncHandler(controller.register));
router.post("/register/cargo-owner", asyncHandler(controller.registerCargoOwner));
router.post("/register/driver", asyncHandler(controller.registerDriver));
router.post("/register/dispatcher", asyncHandler(controller.registerDispatcher));

export { router as authRoutes };
