import { CargoStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function deactivateExpiredCargoPosts() {
  const now = new Date();

  await prisma.cargoPost.updateMany({
    where: {
      status: CargoStatus.ACTIVE,
      expiresAt: {
        lte: now
      }
    },
    data: {
      status: CargoStatus.EXPIRED,
      deactivatedAt: now
    }
  });
}

export function activeCargoPostWhere(now = new Date()): Prisma.CargoPostWhereInput {
  return {
    status: CargoStatus.ACTIVE,
    legacyAdminStatus: "APPROVED",
    deactivatedAt: null,
    OR: [
      { expiresAt: null },
      {
        expiresAt: {
          gt: now
        }
      }
    ]
  };
}

export function isCargoPostEffectivelyActive(
  cargoPost: {
    status: CargoStatus;
    expiresAt?: Date | null;
    legacyAdminStatus?: string | null;
    deactivatedAt?: Date | null;
  },
  now = new Date()
) {
  return (
    cargoPost.status === CargoStatus.ACTIVE &&
    (cargoPost.legacyAdminStatus ?? "APPROVED") === "APPROVED" &&
    !cargoPost.deactivatedAt &&
    (!cargoPost.expiresAt || cargoPost.expiresAt.getTime() > now.getTime())
  );
}
