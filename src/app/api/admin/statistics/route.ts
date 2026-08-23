
import { ok, requireApiUser } from "@/lib/api";
import { getOperatorKpis } from "@/lib/operator-services";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { response } = await requireApiUser(request, ["ADMIN"]);

  if (response) return response;

  const [operatorKpis, usersByRole] = await Promise.all([
    getOperatorKpis(),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true }
    })
  ]);

  return ok({
    operatorKpis,
    usersByRole
  });
}
