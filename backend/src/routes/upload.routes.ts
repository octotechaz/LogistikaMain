import multer from "multer";
import { Router } from "express";
import { UploadController } from "../controllers/UploadController";
import { asyncHandler } from "../http/asyncHandler";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const controller = new UploadController();

router.post("/uploads", upload.single("file"), asyncHandler(controller.upload));
router.post("/upload", upload.single("file"), asyncHandler(controller.upload));

export { router as uploadRoutes };
