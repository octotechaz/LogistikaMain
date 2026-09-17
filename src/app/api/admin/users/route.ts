
import { ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";

export async function GET(request: Request) {
  const { response } = await requireApiUser(request, ["ADMIN"]);

  if (response) return response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: publicUserSelect
  });

  return ok(users);
}
