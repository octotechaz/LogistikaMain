import { Router } from "express";
import { adminRoutes } from "./admin.routes";
import { applicationRoutes } from "./application.routes";
import { authRoutes } from "./auth.routes";
import { loadRoutes } from "./load.routes";
import { operatorRoutes } from "./operator.routes";
import { publicRoutes } from "./public.routes";
import { uploadRoutes } from "./upload.routes";
import { vehicleRoutes } from "./vehicle.routes";
import { whatsappRoutes } from "./whatsapp.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "logistika-backend" });
});

router.use(authRoutes);
router.use(publicRoutes);
router.use(loadRoutes);
router.use(operatorRoutes);
router.use(adminRoutes);
router.use(vehicleRoutes);
router.use(applicationRoutes);
router.use(uploadRoutes);
router.use(whatsappRoutes);

export { router as apiRoutes };
