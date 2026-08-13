
import { LoadStatus } from "@prisma/client";
import { z } from "zod";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { createOperatorLog } from "@/lib/operator-services";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";

const assignSchema = z.object({
  dispatcherId: z.string().min(1, "Dispetçer seçilməlidir."),
  confirm: z.coerce.boolean().optional().default(false)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  try {
    const { id } = await params;
    const payload = assignSchema.parse(await request.json());
    const dispatcher = await prisma.dispatcherProfile.findUnique({ where: { id: payload.dispatcherId } });

    if (!dispatcher) {
      return fail("Dispetçer tapılmadı.", 404);
    }

    const load = await prisma.load.update({
      where: { id },
      data: {
        assignedDispatcherId: payload.dispatcherId,
        assignedDriverId: null,
        operatorId: user!.id,
        status: payload.confirm ? LoadStatus.CONFIRMED : LoadStatus.DISPATCHER_ACCEPTED
      },
      include: {
        assignedDispatcher: { include: { user: { select: publicUserSelect } } },
        cargoOwner: { select: publicUserSelect }
      }
    });

    await createOperatorLog({
      operatorId: user!.id,
      loadId: id,
      action: "DISPATCHER_ASSIGNED",
      metadata: { dispatcherId: payload.dispatcherId, confirm: payload.confirm }
    });

    return ok(load);
  } catch (error) {
    return fail("Dispetçeri təyin etmək alınmadı.", 400, parseZodError(error));
  }
}
