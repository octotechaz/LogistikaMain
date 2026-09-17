
import { fail, ok, requireApiUser } from "@/lib/api";
import { deactivateExpiredCargoPosts } from "@/lib/cargo-post-expiration";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request, ["ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  await deactivateExpiredCargoPosts();

  const cargoPosts = await prisma.cargoPost.findMany({
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          companyName: true
        }
      },
      cargoOwnerProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              companyName: true
            }
          }
        }
      },
      applications: true,
      images: true
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(cargoPosts);
}
