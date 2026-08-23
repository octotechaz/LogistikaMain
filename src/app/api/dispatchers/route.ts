
import { ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";

export async function GET(request: Request) {
  const { response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  const dispatchers = await prisma.dispatcherProfile.findMany({
    include: { user: { select: publicUserSelect } },
    orderBy: [{ activityScore: "desc" }, { createdAt: "desc" }]
  });

  return ok(dispatchers);
}
