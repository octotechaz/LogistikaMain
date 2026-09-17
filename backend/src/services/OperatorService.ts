import { z } from "zod";
import { ContactChannel, ContactResponseStatus, LoadStatus } from "@prisma/client";
import type { BackendUser } from "../middleware/AuthMiddleware";
import { prisma } from "../prisma";
import { publicUserSelect } from "./LoadService";

const contactAttemptSchema = z.object({
  channel: z.nativeEnum(ContactChannel),
  responseStatus: z.nativeEnum(ContactResponseStatus).optional().nullable(),
  messageText: z.string().trim().min(2),
  note: z.string().trim().optional().or(z.literal("")),
  driverId: z.string().optional().nullable(),
  dispatcherId: z.string().optional().nullable()
});

const setStatusSchema = z.object({
  status: z.nativeEnum(LoadStatus)
});

export class OperatorService {
  async dashboard() {
    const [newLoads, activeLoads, completedLoads, drivers, dispatchers, contactAttempts] = await Promise.all([
      prisma.load.count({ where: { status: LoadStatus.NEW } }),
      prisma.load.count({ where: { status: { in: [LoadStatus.CHECKING, LoadStatus.MATCHING, LoadStatus.CONTACTING, LoadStatus.WAITING_RESPONSE, LoadStatus.IN_PROGRESS] } } }),
      prisma.load.count({ where: { status: LoadStatus.COMPLETED } }),
      prisma.driverProfile.count({ where: { status: "ACTIVE", user: { status: "ACTIVE" } } }),
      prisma.dispatcherProfile.count({ where: { status: "ACTIVE", user: { status: "ACTIVE" } } }),
      prisma.loadContactAttempt.count()
    ]);

    return { newLoads, activeLoads, completedLoads, drivers, dispatchers, contactAttempts };
  }

  async drivers() {
    return prisma.driverProfile.findMany({
      where: { status: "ACTIVE", user: { status: "ACTIVE" } },
      include: { user: { select: publicUserSelect } },
      orderBy: [{ activityScore: "desc" }, { updatedAt: "desc" }]
    });
  }

  async dispatchers() {
    return prisma.dispatcherProfile.findMany({
      where: { status: "ACTIVE", user: { status: "ACTIVE" } },
      include: { user: { select: publicUserSelect } },
      orderBy: [{ activityScore: "desc" }, { updatedAt: "desc" }]
    });
  }

  async matchedDrivers(loadId: string) {
    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) return null;

    return prisma.driverProfile.findMany({
      where: {
        status: "ACTIVE",
        user: { status: "ACTIVE" },
        vehicleType: load.requiredVehicleType,
        capacityTons: { gte: load.weight },
        routes: { has: load.pickupCity }
      },
      include: { user: { select: publicUserSelect } },
      orderBy: [{ activityScore: "desc" }, { updatedAt: "desc" }]
    });
  }

  async matchedDispatchers(loadId: string) {
    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) return null;

    return prisma.dispatcherProfile.findMany({
      where: {
        status: "ACTIVE",
        user: { status: "ACTIVE" },
        vehicleTypes: { has: load.requiredVehicleType },
        routes: { has: load.pickupCity }
      },
      include: { user: { select: publicUserSelect } },
      orderBy: [{ activityScore: "desc" }, { updatedAt: "desc" }]
    });
  }

  async recordContact(loadId: string, input: unknown, user: BackendUser) {
    const payload = contactAttemptSchema.parse(input);
    const attempt = await prisma.loadContactAttempt.create({
      data: {
        loadId,
        operatorId: user.id,
        driverId: payload.driverId ?? null,
        dispatcherId: payload.dispatcherId ?? null,
        channel: payload.channel,
        responseStatus: payload.responseStatus ?? null,
        messageText: payload.messageText,
        note: payload.note || null
      }
    });

    await prisma.load.update({
      where: { id: loadId },
      data: {
        status: this.statusFromContact(payload.responseStatus ?? null, payload.dispatcherId ? "dispatcher" : "driver"),
        operatorId: user.id
      }
    });

    await this.log(user.id, loadId, "CONTACT_ATTEMPT_CREATED", payload.note || null, payload);
    return attempt;
  }

  async setStatus(loadId: string, input: unknown, user: BackendUser) {
    const { status } = setStatusSchema.parse(input);
    const load = await prisma.load.update({
      where: { id: loadId },
      data: { status, operatorId: user.id }
    });
    await this.log(user.id, loadId, `LOAD_${status}`);
    return load;
  }

  async assignDriver(loadId: string, driverId: string, confirm: boolean, user: BackendUser) {
    const load = await prisma.load.update({
      where: { id: loadId },
      data: {
        assignedDriverId: driverId,
        assignedDispatcherId: null,
        operatorId: user.id,
        status: confirm ? LoadStatus.CONFIRMED : LoadStatus.DRIVER_ACCEPTED
      }
    });
    await this.log(user.id, loadId, "DRIVER_ASSIGNED", null, { driverId, confirm });
    return load;
  }

  async assignDispatcher(loadId: string, dispatcherId: string, confirm: boolean, user: BackendUser) {
    const load = await prisma.load.update({
      where: { id: loadId },
      data: {
        assignedDispatcherId: dispatcherId,
        assignedDriverId: null,
        operatorId: user.id,
        status: confirm ? LoadStatus.CONFIRMED : LoadStatus.DISPATCHER_ACCEPTED
      }
    });
    await this.log(user.id, loadId, "DISPATCHER_ASSIGNED", null, { dispatcherId, confirm });
    return load;
  }

  private statusFromContact(
    responseStatus: ContactResponseStatus | null,
    targetType: "driver" | "dispatcher"
  ): LoadStatus {
    switch (responseStatus) {
      case ContactResponseStatus.ACCEPTED:
        return targetType === "dispatcher"
          ? LoadStatus.DISPATCHER_ACCEPTED
          : LoadStatus.DRIVER_ACCEPTED;
      case ContactResponseStatus.PRICE_TOO_LOW:
        return LoadStatus.PRICE_TOO_LOW;
      case ContactResponseStatus.DECLINED:
        return LoadStatus.CONTACTING;
      case ContactResponseStatus.NO_ANSWER:
      case ContactResponseStatus.CALL_LATER:
        return LoadStatus.WAITING_RESPONSE;
      default:
        return LoadStatus.CONTACTING;
    }
  }

  private log(operatorId: string, loadId: string, action: string, note?: string | null, metadata?: unknown) {
    return prisma.operatorLog.create({
      data: {
        operatorId,
        loadId,
        action,
        note: note ?? null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined
      }
    });
  }
}