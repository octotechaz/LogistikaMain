
import { ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { response } = await requireApiUser(request, ["ADMIN"]);

  if (response) return response;

  const [
    totalUsers,
    cargoOwners,
    drivers,
    dispatchers,
    operators,
    newLoads,
    activeLoads,
    completedLoads,
    pendingContactAttempts
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CARGO_OWNER" } }),
    prisma.user.count({ where: { role: "DRIVER" } }),
    prisma.user.count({ where: { role: "DISPATCHER" } }),
    prisma.user.count({ where: { role: "OPERATOR" } }),
    prisma.load.count({ where: { status: "NEW" } }),
    prisma.load.count({ where: { status: { in: ["NEW", "CHECKING", "MATCHING", "CONTACTING", "WAITING_RESPONSE"] } } }),
    prisma.load.count({ where: { status: "COMPLETED" } }),
    prisma.loadContactAttempt.count({ where: { responseStatus: null } })
  ]);

  return ok({
    totalUsers,
    cargoOwners,
    drivers,
    dispatchers,
    operators,
    newLoads,
    activeLoads,
    completedLoads,
    pendingContactAttempts
  });
}
