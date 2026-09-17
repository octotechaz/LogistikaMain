import { ImageCategory } from "@prisma/client";
import { z } from "zod";
import type { BackendUser } from "../middleware/AuthMiddleware";
import { prisma } from "../prisma";
import { publicUserSelect } from "./LoadService";

const vehicleSchema = z.object({
  vehicleType: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  plateNumber: z.string().trim().min(1),
  driverFirstName: z.string().trim().min(1),
  driverLastName: z.string().trim().min(1),
  driverPhone: z.string().trim().min(7),
  capacityTons: z.coerce.number().positive(),
  bodyLength: z.coerce.number().positive(),
  bodyWidth: z.coerce.number().positive(),
  bodyHeight: z.coerce.number().positive(),
  overallDimensions: z.string().trim().min(1),
  workDays: z.array(z.string()).default([]),
  workHours: z.string().trim().min(1),
  serviceAreas: z.array(z.string()).default([]),
  imageUrls: z.array(z.string()).default([]),
  documentImageUrls: z.array(z.string()).default([])
});

export class VehicleService {
  list(user: BackendUser) {
    return prisma.vehicle.findMany({
      where: user.role === "CARRIER" ? { carrierId: user.id } : undefined,
      include: { images: true, carrierProfile: { include: { user: { select: publicUserSelect } } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(input: unknown, user: BackendUser) {
    const payload = vehicleSchema.parse(input);
    const carrierProfile = await prisma.carrierProfile.findUnique({ where: { userId: user.id } });

    if (!carrierProfile) {
      throw new Error("Daşıyıcı profili tapılmadı.");
    }

    return prisma.vehicle.create({
      data: {
        carrierId: user.id,
        carrierProfileId: carrierProfile.id,
        vehicleType: payload.vehicleType,
        brand: payload.brand,
        model: payload.model,
        plateNumber: payload.plateNumber,
        driverFirstName: payload.driverFirstName,
        driverLastName: payload.driverLastName,
        driverPhone: payload.driverPhone,
        capacityTons: payload.capacityTons,
        bodyLength: payload.bodyLength,
        bodyWidth: payload.bodyWidth,
        bodyHeight: payload.bodyHeight,
        overallDimensions: payload.overallDimensions,
        workDays: payload.workDays,
        workHours: payload.workHours,
        serviceAreas: payload.serviceAreas,
        images: {
          create: [
            ...payload.imageUrls.map((url) => ({ url, category: ImageCategory.VEHICLE, userId: user.id })),
            ...payload.documentImageUrls.map((url) => ({ url, category: ImageCategory.VEHICLE_DOCUMENT, userId: user.id }))
          ]
        }
      },
      include: { images: true }
    });
  }

  async update(id: string, input: unknown, user: BackendUser) {
    await this.assertVehicleAccess(id, user);
    const payload = vehicleSchema.partial().parse(input);
    const { imageUrls, documentImageUrls, ...vehicleData } = payload;

    return prisma.vehicle.update({
      where: { id },
      data: {
        ...vehicleData,
        images:
          imageUrls || documentImageUrls
            ? {
                deleteMany: {},
                create: [
                  ...(imageUrls ?? []).map((url) => ({ url, category: ImageCategory.VEHICLE, userId: user.id })),
                  ...(documentImageUrls ?? []).map((url) => ({ url, category: ImageCategory.VEHICLE_DOCUMENT, userId: user.id }))
                ]
              }
            : undefined
      },
      include: { images: true }
    });
  }

  async delete(id: string, user: BackendUser) {
    await this.assertVehicleAccess(id, user);
    await prisma.vehicle.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertVehicleAccess(id: string, user: BackendUser) {
    if (user.role === "ADMIN") return;
    const vehicle = await prisma.vehicle.findFirst({ where: { id, carrierId: user.id } });
    if (!vehicle) throw new Error("Bu avtomobili redaktə etmək icazəniz yoxdur.");
  }
}