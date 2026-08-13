
import { ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";

export async function GET(request: Request) {
  const { response } = await requireApiUser(request, ["ADMIN"]);

  if (response) return response;

  const loads = await prisma.load.findMany({
    include: {
      cargoOwner: { select: publicUserSelect },
      operator: { select: publicUserSelect },
      assignedDriver: { include: { user: { select: publicUserSelect } } },
      assignedDispatcher: { include: { user: { select: publicUserSelect } } }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(loads);
}
