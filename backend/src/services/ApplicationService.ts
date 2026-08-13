
import { ApplicationStatus, CargoStatus } from "@prisma/client";
import { z } from "zod";
import type { BackendUser } from "../middleware/AuthMiddleware";
import { prisma } from "../prisma";
import { normalizeNumber } from "../utils/validation";
import { publicUserSelect } from "./LoadService";

const createSchema = z.object({
  cargoPostId: z.string().min(1),
  vehicleId: z.string().min(1),
  message: z.string().optional().or(z.literal("")),
  offeredPrice: z.preprocess(normalizeNumber, z.number().positive().nullable()).optional()
});

export class ApplicationService {
  list(user: BackendUser) {
    return prisma.cargoApplication.findMany({
      where:
        user.role === "CARRIER"
          ? { carrierId: user.id }
          : user.role === "CARGO_OWNER"
            ? { cargoPost: { ownerId: user.id } }
            : undefined,
      include: {
        cargoPost: true,
        vehicle: true,
        carrierProfile: { include: { user: { select: publicUserSelect } } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(input: unknown, user: BackendUser) {
    const payload = createSchema.parse(input);
    const carrierProfile = await prisma.carrierProfile.findUnique({ where: { userId: user.id } });

    if (!carrierProfile) throw new Error("Daşıyıcı profili tapılmadı.");

    return prisma.cargoApplication.create({
      data: {
        cargoPostId: payload.cargoPostId,
        carrierId: user.id,
        carrierProfileId: carrierProfile.id,
        vehicleId: payload.vehicleId,
        message: payload.message || null,
        offeredPrice: payload.offeredPrice ?? null
      },
      include: {
        cargoPost: true,
        vehicle: true,
        carrierProfile: { include: { user: { select: publicUserSelect } } }
      }
    });
  }

  async decide(id: string, status: ApplicationStatus, user: BackendUser) {
    const application = await prisma.cargoApplication.findFirst({
      where: { id, cargoPost: { ownerId: user.id } },
      include: { cargoPost: true }
    });

    if (!application) return null;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.cargoApplication.update({
        where: { id },
        data: { status },
        include: { cargoPost: true, vehicle: true, carrierProfile: { include: { user: { select: publicUserSelect } } } }
      });

      if (status === ApplicationStatus.ACCEPTED) {
        await tx.cargoPost.update({ where: { id: application.cargoPostId }, data: { status: CargoStatus.ASSIGNED } });
        await tx.cargoApplication.updateMany({
          where: { cargoPostId: application.cargoPostId, id: { not: id }, status: ApplicationStatus.PENDING },
          data: { status: ApplicationStatus.REJECTED }
        });
      }

      return updated;
    });
  }
}
