
import { z } from "zod";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { createOperatorLog } from "@/lib/operator-services";
import { LoadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";

const assignSchema = z.object({
  driverId: z.string().min(1, "Sürücü seçilməlidir."),
  confirm: z.coerce.boolean().optional().default(false)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  try {
    const { id } = await params;
    const payload = assignSchema.parse(await request.json());
    const driver = await prisma.driverProfile.findUnique({ where: { id: payload.driverId } });

    if (!driver) {
      return fail("Sürücü tapılmadı.", 404);
    }

    const load = await prisma.load.update({
      where: { id },
      data: {
        assignedDriverId: payload.driverId,
        assignedDispatcherId: null,
        operatorId: user!.id,
        status: payload.confirm ? LoadStatus.CONFIRMED : LoadStatus.DRIVER_ACCEPTED
      },
      include: {
        assignedDriver: { include: { user: { select: publicUserSelect } } },
        cargoOwner: { select: publicUserSelect }
      }
    });

    await createOperatorLog({
      operatorId: user!.id,
      loadId: id,
      action: "DRIVER_ASSIGNED",
      metadata: { driverId: payload.driverId, confirm: payload.confirm }
    });

    return ok(load);
  } catch (error) {
    return fail("Sürücünü təyin etmək alınmadı.", 400, parseZodError(error));
  }
}
