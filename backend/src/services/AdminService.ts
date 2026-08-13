
import { prisma } from "../prisma";
import { UserStatus, VehicleStatus } from "@prisma/client";
import { publicUserSelect } from "./LoadService";
import { PublicCatalogService } from "./PublicCatalogService";

export class AdminService {
  private publicCatalog = new PublicCatalogService();

  async dashboard() {
    const [totalUsers, cargoOwners, drivers, dispatchers, operators, newLoads, activeLoads, completedLoads, pendingContactAttempts] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "CARGO_OWNER" } }),
        prisma.user.count({ where: { role: "DRIVER" } }),
        prisma.user.count({ where: { role: "DISPATCHER" } }),
        prisma.user.count({ where: { role: "OPERATOR" } }),
        prisma.load.count({ where: { status: "NEW" } }),
        prisma.load.count({
          where: { status: { in: ["CHECKING", "MATCHING", "CONTACTING", "WAITING_RESPONSE", "IN_PROGRESS"] } }
        }),
        prisma.load.count({ where: { status: "COMPLETED" } }),
        prisma.loadContactAttempt.count({ where: { responseStatus: null } })
      ]);

    return { totalUsers, cargoOwners, drivers, dispatchers, operators, newLoads, activeLoads, completedLoads, pendingContactAttempts };
  }

  users() {
    return prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: publicUserSelect });
  }

  updateUserStatus(id: string, status: UserStatus, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { status }, select: publicUserSelect });
      await tx.adminLog.create({
        data: { adminId, action: "USER_STATUS_UPDATED", entityType: "User", entityId: id, metadata: JSON.stringify({ status }) }
      });
      return user;
    });
  }

  loads() {
    return prisma.load.findMany({
      include: {
        cargoOwner: { select: publicUserSelect },
        operator: { select: publicUserSelect },
        assignedDriver: { include: { user: { select: publicUserSelect } } },
        assignedDispatcher: { include: { user: { select: publicUserSelect } } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  vehicles() {
    return prisma.vehicle.findMany({
      include: { carrier: { select: publicUserSelect }, images: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async updateVehicleStatus(id: string, status: VehicleStatus, adminId: string) {
    const vehicle = await prisma.vehicle.update({ where: { id }, data: { status }, include: { carrierProfile: true } });
    await prisma.adminLog.create({
      data: { adminId, action: "VEHICLE_STATUS_UPDATED", entityType: "Vehicle", entityId: id, metadata: JSON.stringify({ status }) }
    });
    return vehicle;
  }

  cargoPosts() {
    return prisma.cargoPost.findMany({
      include: { owner: { select: publicUserSelect }, applications: true, images: true },
      orderBy: { createdAt: "desc" }
    });
  }

  operators() {
    return prisma.user.findMany({ where: { role: "OPERATOR" }, select: publicUserSelect, orderBy: { createdAt: "desc" } });
  }

  async statistics() {
    const usersByRole = await prisma.user.groupBy({ by: ["role"], _count: { role: true } });
    const dashboard = await this.dashboard();
    return { dashboard, usersByRole };
  }

  publicCategories(includeInactive = true) {
    return this.publicCatalog.categories(includeInactive);
  }

  async savePublicCategory(input: unknown) {
    return this.publicCatalog.upsertCategory(input);
  }

  async deletePublicCategory(id: string) {
    return this.publicCatalog.deleteCategory(id);
  }
}
