
import { LoadStatus } from "@prisma/client";
import { z } from "zod";
import type { BackendUser } from "../middleware/AuthMiddleware";
import { prisma } from "../prisma";
import { normalizeNumber } from "../utils/validation";

export const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  role: true,
  companyName: true,
  profileImage: true,
  status: true,
  createdAt: true,
  updatedAt: true
};

const numberField = z.preprocess(normalizeNumber, z.number().positive());
const optionalNumberField = z.preprocess(normalizeNumber, z.number().positive().nullable());

const loadCreateSchema = z.object({
  title: z.string().trim().min(2),
  cargoType: z.string().trim().min(2),
  description: z.string().trim().min(5),
  weight: numberField,
  volume: optionalNumberField.optional(),
  length: optionalNumberField.optional(),
  width: optionalNumberField.optional(),
  height: optionalNumberField.optional(),
  quantity: z.string().trim().optional().or(z.literal("")),
  pickupCity: z.string().trim().min(2),
  deliveryCity: z.string().trim().min(2),
  pickupAddress: z.string().trim().min(2),
  deliveryAddress: z.string().trim().min(2),
  pickupDate: z.coerce.date(),
  pickupTime: z.string().trim().optional().or(z.literal("")),
  requiredVehicleType: z.string().trim().min(2),
  priceFrom: optionalNumberField.optional(),
  priceTo: optionalNumberField.optional(),
  isNegotiable: z.coerce.boolean().default(false),
  contactPhone: z.string().trim().min(7),
  note: z.string().trim().optional().or(z.literal(""))
});

const loadInclude = {
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
};

export class LoadService {
  async list(user: BackendUser) {
    return prisma.load.findMany({
      where: user.role === "CARGO_OWNER" ? { cargoOwnerId: user.id } : undefined,
      include: loadInclude,
      orderBy: { createdAt: "desc" }
    });
  }

  async get(id: string, user: BackendUser) {
    const load = await prisma.load.findUnique({ where: { id }, include: loadInclude });

    if (!load) return null;
    if (user.role === "CARGO_OWNER" && load.cargoOwnerId !== user.id) return null;
    return load;
  }

  async create(input: unknown, user: BackendUser) {
    const payload = loadCreateSchema.parse(input);
    const cargoOwnerProfile = await prisma.cargoOwnerProfile.findUnique({ where: { userId: user.id } });

    if (!cargoOwnerProfile) {
      throw new Error("Yük verən profili tapılmadı.");
    }

    return prisma.load.create({
      data: {
        cargoOwnerId: user.id,
        cargoOwnerProfileId: cargoOwnerProfile.id,
        title: payload.title,
        cargoType: payload.cargoType,
        description: payload.description,
        weight: payload.weight,
        volume: payload.volume ?? null,
        length: payload.length ?? null,
        width: payload.width ?? null,
        height: payload.height ?? null,
        quantity: payload.quantity || null,
        pickupCity: payload.pickupCity,
        deliveryCity: payload.deliveryCity,
        pickupAddress: payload.pickupAddress,
        deliveryAddress: payload.deliveryAddress,
        pickupDate: payload.pickupDate,
        pickupTime: payload.pickupTime || null,
        requiredVehicleType: payload.requiredVehicleType,
        priceFrom: payload.priceFrom ?? null,
        priceTo: payload.priceTo ?? null,
        isNegotiable: payload.isNegotiable,
        contactPhone: payload.contactPhone,
        note: payload.note || null,
        status: LoadStatus.NEW
      },
      include: loadInclude
    });
  }

  async update(id: string, input: { status?: LoadStatus; operatorNote?: string | null }, user: BackendUser) {
    return prisma.load.update({
      where: { id },
      data: {
        status: input.status,
        operatorNote: input.operatorNote,
        operatorId: user.role === "OPERATOR" || user.role === "ADMIN" ? user.id : undefined
      },
      include: loadInclude
    });
  }
}
