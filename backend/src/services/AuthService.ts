import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { hashPassword, publicUser, signAuthToken, verifyPassword } from "../utils/auth";
import passwordPolicy from "../../../config/password-policy.json";

const phoneSchema = z.string().trim().min(7).regex(/^[+0-9\s()-]+$/);
const passwordSchema = z.string().min(passwordPolicy.minimumLength, passwordPolicy.minimumMessage);

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1)
});

const registerSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: phoneSchema,
  email: z.string().trim().email(),
  password: passwordSchema,
  role: z.nativeEnum(Role).default(Role.CARRIER),
  companyName: z.string().trim().optional().or(z.literal(""))
});

const cargoOwnerSchema = registerSchema.omit({ role: true }).extend({
  companyName: z.string().trim().optional().or(z.literal("")),
  voen: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal(""))
});

const stringList = z
  .union([z.array(z.string()), z.string()])
  .transform((value) =>
    Array.isArray(value)
      ? value.map((item) => item.trim()).filter(Boolean)
      : value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
  );

const driverRegisterSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: phoneSchema,
  whatsappPhone: phoneSchema,
  city: z.string().trim().min(2),
  vehicleType: z.string().trim().min(2),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  plateNumber: z.string().trim().min(2),
  capacityTons: z.coerce.number().positive(),
  bodyLength: z.coerce.number().positive(),
  bodyWidth: z.coerce.number().positive(),
  bodyHeight: z.coerce.number().positive(),
  workingDays: stringList,
  workingHours: z.string().trim().min(2),
  routes: stringList,
  notificationChannels: stringList,
  consentToReceiveOffers: z.coerce.boolean().default(true)
});

const dispatcherRegisterSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: phoneSchema,
  whatsappPhone: phoneSchema,
  companyName: z.string().trim().min(2),
  vehicleCount: z.coerce.number().int().positive(),
  vehicleTypes: stringList,
  routes: stringList,
  note: z.string().trim().optional().or(z.literal(""))
});

function generatedRoleEmail(role: "driver" | "dispatcher", phone: string) {
  const normalizedPhone = phone.replace(/[^0-9]+/g, "") || crypto.randomUUID();
  return `${role}-${normalizedPhone}@loqistika.local`;
}

export class AuthService {
  async login(input: unknown) {
    const payload = loginSchema.parse(input);
    const user = await prisma.user.findUnique({
      where: payload.email.includes("@") ? { email: payload.email.toLowerCase() } : { phone: payload.email }
    });

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      throw new Error("Email və ya şifrə yanlışdır.");
    }

    if (user.status === "BLOCKED") {
      throw new Error("Hesabınız bloklanıb.");
    }

    const token = await signAuthToken({ sub: user.id, role: user.role, email: user.email });
    return {
      token,
      user: publicUser(user),
      redirectTo: this.dashboardPathForRole(user.role)
    };
  }

  async register(input: unknown) {
    const payload = registerSchema.parse(input);
    const passwordHash = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email: payload.email.toLowerCase(),
        passwordHash,
        role: payload.role,
        companyName: payload.companyName || null,
        carrierProfile:
          payload.role === Role.CARRIER
            ? { create: {} }
            : undefined,
        cargoOwnerProfile:
          payload.role === Role.CARGO_OWNER
            ? { create: { companyName: payload.companyName || null } }
            : undefined
      }
    });

    const token = await signAuthToken({ sub: user.id, role: user.role, email: user.email });
    return { token, user: publicUser(user), redirectTo: this.dashboardPathForRole(user.role) };
  }

  async registerCargoOwner(input: unknown) {
    const payload = cargoOwnerSchema.parse(input);
    const passwordHash = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email: payload.email.toLowerCase(),
        passwordHash,
        role: Role.CARGO_OWNER,
        companyName: payload.companyName || null,
        cargoOwnerProfile: {
          create: {
            companyName: payload.companyName || null,
            voen: payload.voen || null,
            city: payload.city || null
          }
        }
      }
    });

    const token = await signAuthToken({ sub: user.id, role: user.role, email: user.email });
    return { token, user: publicUser(user), redirectTo: this.dashboardPathForRole(user.role) };
  }

  async registerDriver(input: unknown) {
    const payload = driverRegisterSchema.parse(input);
    const email = generatedRoleEmail("driver", payload.phone);
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { phone: payload.phone }] } });

    if (existingUser) {
      throw new Error("Bu telefonla istifadəçi artıq qeydiyyatdan keçib.");
    }

    const user = await prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email,
        passwordHash: await hashPassword(crypto.randomUUID()),
        role: Role.DRIVER,
        driverProfile: {
          create: {
            whatsappPhone: payload.whatsappPhone,
            city: payload.city,
            vehicleType: payload.vehicleType,
            brand: payload.brand,
            model: payload.model,
            plateNumber: payload.plateNumber,
            capacityTons: payload.capacityTons,
            bodyLength: payload.bodyLength,
            bodyWidth: payload.bodyWidth,
            bodyHeight: payload.bodyHeight,
            workingDays: payload.workingDays,
            workingHours: payload.workingHours,
            routes: payload.routes,
            notificationChannels: payload.notificationChannels,
            consentToReceiveOffers: payload.consentToReceiveOffers
          }
        }
      },
      include: { driverProfile: true }
    });

    return { userId: user.id, profileId: user.driverProfile?.id };
  }

  async registerDispatcher(input: unknown) {
    const payload = dispatcherRegisterSchema.parse(input);
    const email = generatedRoleEmail("dispatcher", payload.phone);
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { phone: payload.phone }] } });

    if (existingUser) {
      throw new Error("Bu telefonla istifadəçi artıq qeydiyyatdan keçib.");
    }

    const user = await prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email,
        passwordHash: await hashPassword(crypto.randomUUID()),
        role: Role.DISPATCHER,
        companyName: payload.companyName,
        dispatcherProfile: {
          create: {
            whatsappPhone: payload.whatsappPhone,
            companyName: payload.companyName,
            vehicleCount: payload.vehicleCount,
            vehicleTypes: payload.vehicleTypes,
            routes: payload.routes,
            note: payload.note || null
          }
        }
      },
      include: { dispatcherProfile: true }
    });

    return { userId: user.id, profileId: user.dispatcherProfile?.id };
  }

  dashboardPathForRole(role: Role) {
    if (role === Role.CARRIER) return "/carrier/dashboard";
    if (role === Role.CARGO_OWNER) return "/cargo-owner/dashboard";
    if (role === Role.OPERATOR) return "/operator/dashboard";
    if (role === Role.ADMIN) return "/admin/dashboard";
    return "/";
  }
}
