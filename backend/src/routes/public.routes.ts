import { Router } from "express";
import { PublicController } from "../controllers/PublicController";
import { asyncHandler } from "../http/asyncHandler";

const router = Router();
const controller = new PublicController();

router.get("/public/listings", asyncHandler(controller.listings));
router.get("/public/listings/:id", asyncHandler(controller.listing));
router.get("/public/categories", asyncHandler(controller.categories));

export { router as publicRoutes };
