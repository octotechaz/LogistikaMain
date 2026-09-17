
import { LoadStatus } from "@prisma/client";
import { z } from "zod";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { createOperatorLog } from "@/lib/operator-services";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({
  status: z.nativeEnum(LoadStatus)
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  try {
    const { id } = await params;
    const payload = statusSchema.parse(await request.json());
    const load = await prisma.load.update({
      where: { id },
      data: {
        status: payload.status,
        operatorId: user!.id
      }
    });

    await createOperatorLog({
      operatorId: user!.id,
      loadId: id,
      action: "LOAD_STATUS_UPDATED",
      note: payload.status
    });

    return ok(load);
  } catch (error) {
    return fail("Statusu yeniləmək alınmadı.", 400, parseZodError(error));
  }
}
