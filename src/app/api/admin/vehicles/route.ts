
import { fail, ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request, ["ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const vehicles = await prisma.vehicle.findMany({
    include: {
      carrier: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true
        }
      },
      images: true
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(vehicles);
}
