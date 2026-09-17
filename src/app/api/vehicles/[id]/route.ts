
import { ImageCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { vehicleSchema } from "@/lib/validations/vehicle";

async function findAuthorizedVehicle(id: string, userId: string) {
  return prisma.vehicle.findFirst({
    where: {
      id,
      carrierId: userId
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["CARRIER", "ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const { id } = await params;

  if (user.role === "CARRIER") {
    const vehicle = await findAuthorizedVehicle(id, user.id);

    if (!vehicle) {
      return fail("Bu avtomobili redaktə etmək icazəniz yoxdur.", 403);
    }
  }

  try {
    const payload = vehicleSchema.partial().parse(await request.json());
    const { imageUrls, documentImageUrls, ...vehicleData } = payload;
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...vehicleData,
        images:
          imageUrls || documentImageUrls
            ? {
                deleteMany: {},
                create: [
                  ...(imageUrls ?? []).map((url) => ({
                    url,
                    category: ImageCategory.VEHICLE,
                    userId: user.id
                  })),
                  ...(documentImageUrls ?? []).map((url) => ({
                    url,
                    category: ImageCategory.VEHICLE_DOCUMENT,
                    userId: user.id
                  }))
                ]
              }
            : undefined
      },
      include: {
        images: true
      }
    });

    return ok(vehicle);
  } catch (error) {
    return fail("Avtomobil yenilənmədi.", 400, parseZodError(error));
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["CARRIER", "ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const { id } = await params;

  if (user.role === "CARRIER") {
    const vehicle = await findAuthorizedVehicle(id, user.id);

    if (!vehicle) {
      return fail("Bu avtomobili silmək icazəniz yoxdur.", 403);
    }
  }

  await prisma.vehicle.delete({ where: { id } });

  return ok({ deleted: true });
}
