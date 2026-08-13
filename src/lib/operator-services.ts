import { ContactChannel, ContactResponseStatus, LoadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";
import { buildOperatorSmsMessage, buildOperatorWhatsappMessage, buildWhatsappLink } from "@/lib/operator-utils";

export const operatorLoadInclude = {
  cargoOwner: { select: publicUserSelect },
  operator: { select: publicUserSelect },
  assignedDriver: { include: { user: { select: publicUserSelect } } },
  assignedDispatcher: { include: { user: { select: publicUserSelect } } },
  cargoOwnerProfile: true,
  contactAttempts: {
    include: {
      driver: { include: { user: { select: publicUserSelect } } },
      dispatcher: { include: { user: { select: publicUserSelect } } },
      operator: { select: publicUserSelect }
    },
    orderBy: { createdAt: "desc" as const }
  }
} satisfies Prisma.LoadInclude;

export async function getLoadDetail(id: string) {
  return prisma.load.findUnique({
    where: { id },
    include: operatorLoadInclude
  });
}

export async function createOperatorLog(input: {
  operatorId?: string | null;
  loadId?: string | null;
  action: string;
  note?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.operatorLog.create({
    data: {
      operatorId: input.operatorId ?? null,
      loadId: input.loadId ?? null,
      action: input.action,
      note: input.note ?? null,
      metadata: input.metadata ?? undefined
    }
  });
}

export async function getMatchedDrivers(loadId: string) {
  const load = await prisma.load.findUnique({ where: { id: loadId } });

  if (!load) {
    return null;
  }

  const drivers = await prisma.driverProfile.findMany({
    where: {
      status: "ACTIVE",
      user: { status: "ACTIVE" },
      vehicleType: load.requiredVehicleType,
      capacityTons: { gte: load.weight },
      routes: { hasSome: [load.pickupCity, load.deliveryCity] }
    },
    include: { user: { select: publicUserSelect } }
  });

  return drivers.sort((first, second) => {
    if (second.activityScore !== first.activityScore) {
      return second.activityScore - first.activityScore;
    }

    const firstCapacityDiff = first.capacityTons - load.weight;
    const secondCapacityDiff = second.capacityTons - load.weight;

    if (firstCapacityDiff !== secondCapacityDiff) {
      return firstCapacityDiff - secondCapacityDiff;
    }

    return second.updatedAt.getTime() - first.updatedAt.getTime();
  });
}

export async function getMatchedDispatchers(loadId: string) {
  const load = await prisma.load.findUnique({ where: { id: loadId } });

  if (!load) {
    return null;
  }

  return prisma.dispatcherProfile.findMany({
    where: {
      status: "ACTIVE",
      user: { status: "ACTIVE" },
      vehicleTypes: { has: load.requiredVehicleType },
      routes: { hasSome: [load.pickupCity, load.deliveryCity] }
    },
    include: { user: { select: publicUserSelect } },
    orderBy: [{ activityScore: "desc" }, { updatedAt: "desc" }]
  });
}

export function statusFromContactResponse(responseStatus?: ContactResponseStatus | null, targetType?: "driver" | "dispatcher") {
  if (responseStatus === ContactResponseStatus.ACCEPTED) {
    return targetType === "dispatcher" ? LoadStatus.DISPATCHER_ACCEPTED : LoadStatus.DRIVER_ACCEPTED;
  }

  if (responseStatus === ContactResponseStatus.PRICE_TOO_LOW) {
    return LoadStatus.PRICE_TOO_LOW;
  }

  if (responseStatus === ContactResponseStatus.NO_ANSWER || responseStatus === ContactResponseStatus.CALL_LATER) {
    return LoadStatus.WAITING_RESPONSE;
  }

  return LoadStatus.CONTACTING;
}

export async function recordContactAttempt(input: {
  loadId: string;
  operatorId: string;
  driverId?: string | null;
  dispatcherId?: string | null;
  channel: ContactChannel;
  responseStatus?: ContactResponseStatus | null;
  messageText: string;
  note?: string | null;
}) {
  const attempt = await prisma.loadContactAttempt.create({
    data: {
      loadId: input.loadId,
      operatorId: input.operatorId,
      driverId: input.driverId ?? null,
      dispatcherId: input.dispatcherId ?? null,
      channel: input.channel,
      responseStatus: input.responseStatus ?? null,
      messageText: input.messageText,
      note: input.note ?? null
    }
  });

  const targetType = input.dispatcherId ? "dispatcher" : "driver";
  await prisma.load.update({
    where: { id: input.loadId },
    data: {
      status: statusFromContactResponse(input.responseStatus, targetType),
      operatorId: input.operatorId
    }
  });

  if (input.driverId && input.responseStatus === ContactResponseStatus.ACCEPTED) {
    await prisma.driverProfile.update({
      where: { id: input.driverId },
      data: { activityScore: { increment: 1 } }
    });
  }

  if (input.driverId && input.responseStatus === ContactResponseStatus.NO_ANSWER) {
    const noAnswerCount = await prisma.loadContactAttempt.count({
      where: {
        driverId: input.driverId,
        responseStatus: ContactResponseStatus.NO_ANSWER
      }
    });

    if (noAnswerCount > 0 && noAnswerCount % 3 === 0) {
      await prisma.driverProfile.update({
        where: { id: input.driverId },
        data: { activityScore: { decrement: 3 } }
      });
    }
  }

  await createOperatorLog({
    operatorId: input.operatorId,
    loadId: input.loadId,
    action: "CONTACT_ATTEMPT_CREATED",
    note: input.note ?? null,
    metadata: JSON.parse(JSON.stringify({
      channel: input.channel,
      responseStatus: input.responseStatus,
      driverId: input.driverId,
      dispatcherId: input.dispatcherId
    }))
  });

  return attempt;
}

export async function buildMessageResponse(loadId: string, channel: "whatsapp" | "sms", targetType: "driver" | "dispatcher", targetId: string) {
  const load = await prisma.load.findUnique({ where: { id: loadId } });

  if (!load) {
    return null;
  }

  const messageText = channel === "whatsapp" ? buildOperatorWhatsappMessage(load) : buildOperatorSmsMessage(load);
  const encodedMessage = encodeURIComponent(messageText);

  if (targetType === "driver") {
    const target = await prisma.driverProfile.findUnique({
      where: { id: targetId },
      include: { user: { select: publicUserSelect } }
    });

    if (!target) {
      return null;
    }

    return {
      messageText,
      encodedMessage,
      whatsappUrl: buildWhatsappLink(target.whatsappPhone, messageText)
    };
  }

  const target = await prisma.dispatcherProfile.findUnique({
    where: { id: targetId },
    include: { user: { select: publicUserSelect } }
  });

  if (!target) {
    return null;
  }

  return {
    messageText,
    encodedMessage,
    whatsappUrl: buildWhatsappLink(target.user.phone, messageText)
  };
}

export async function getOperatorKpis() {
  const [
    newLoadsCount,
    waitingResponseCount,
    confirmedLoadsCount,
    completedLoadsCount,
    cancelledLoadsCount,
    activeDriversCount,
    activeDispatchersCount,
    contactAttemptsCount,
    answeredAttemptsCount,
    firstAttempts
  ] = await Promise.all([
    prisma.load.count({ where: { status: LoadStatus.NEW } }),
    prisma.load.count({ where: { status: LoadStatus.WAITING_RESPONSE } }),
    prisma.load.count({ where: { status: LoadStatus.CONFIRMED } }),
    prisma.load.count({ where: { status: LoadStatus.COMPLETED } }),
    prisma.load.count({ where: { status: LoadStatus.CANCELLED } }),
    prisma.driverProfile.count({ where: { status: "ACTIVE", user: { status: "ACTIVE" } } }),
    prisma.dispatcherProfile.count({ where: { status: "ACTIVE", user: { status: "ACTIVE" } } }),
    prisma.loadContactAttempt.count(),
    prisma.loadContactAttempt.count({
      where: { responseStatus: { in: [ContactResponseStatus.ACCEPTED, ContactResponseStatus.DECLINED, ContactResponseStatus.PRICE_TOO_LOW] } }
    }),
    prisma.loadContactAttempt.findMany({
      distinct: ["loadId"],
      include: { load: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const averageFirstResponseMinutes =
    firstAttempts.length > 0
      ? Math.round(
          firstAttempts.reduce((sum, attempt) => {
            return sum + Math.max(0, attempt.createdAt.getTime() - attempt.load.createdAt.getTime()) / 60000;
          }, 0) / firstAttempts.length
        )
      : 0;

  return {
    newLoadsCount,
    waitingResponseCount,
    confirmedLoadsCount,
    completedLoadsCount,
    cancelledLoadsCount,
    activeDriversCount,
    activeDispatchersCount,
    driverResponseRate: contactAttemptsCount > 0 ? Math.round((answeredAttemptsCount / contactAttemptsCount) * 100) : 0,
    averageFirstResponseMinutes,
    threeOfferTargetMinutes: 15
  };
}
