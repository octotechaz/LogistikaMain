
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { createOperatorLog, getLoadDetail } from "@/lib/operator-services";
import { LoadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";
import { loadUpdateSchema } from "@/lib/validations/operator-load";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER", "OPERATOR", "ADMIN"]);

  if (response) return response;

  const { id } = await params;
  const load = await getLoadDetail(id);

  if (!load) {
    return fail("Yük tapılmadı.", 404);
  }

  if (user?.role === "CARGO_OWNER" && load.cargoOwnerId !== user.id) {
    return fail("Bu yükə baxmaq icazəniz yoxdur.", 403);
  }

  return ok(load);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  try {
    const { id } = await params;
    const payload = loadUpdateSchema.parse(await request.json());
    const status =
      payload.status ??
      (payload.assignedDriverId ? LoadStatus.DRIVER_ACCEPTED : payload.assignedDispatcherId ? LoadStatus.DISPATCHER_ACCEPTED : undefined);

    const load = await prisma.load.update({
      where: { id },
      data: {
        status,
        operatorNote: payload.operatorNote,
        operatorId: payload.operatorId === undefined ? user?.id : payload.operatorId,
        assignedDriverId: payload.assignedDriverId === undefined ? undefined : payload.assignedDriverId,
        assignedDispatcherId: payload.assignedDispatcherId === undefined ? undefined : payload.assignedDispatcherId
      },
      include: {
        cargoOwner: { select: publicUserSelect },
        assignedDriver: { include: { user: { select: publicUserSelect } } },
        assignedDispatcher: { include: { user: { select: publicUserSelect } } }
      }
    });

    await createOperatorLog({
      operatorId: user?.id,
      loadId: id,
      action: "LOAD_UPDATED",
      note: payload.operatorNote ?? null,
      metadata: JSON.parse(JSON.stringify(payload))
    });

    return ok(load);
  } catch (error) {
    return fail("Yük statusunu yeniləmək alınmadı.", 400, parseZodError(error));
  }
}
