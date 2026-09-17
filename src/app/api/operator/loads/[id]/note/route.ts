
import { z } from "zod";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { createOperatorLog } from "@/lib/operator-services";
import { prisma } from "@/lib/prisma";

const noteSchema = z.object({
  operatorNote: z.string().trim().optional().or(z.literal(""))
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  try {
    const { id } = await params;
    const payload = noteSchema.parse(await request.json());
    const load = await prisma.load.update({
      where: { id },
      data: {
        operatorNote: payload.operatorNote || null,
        operatorId: user!.id
      }
    });

    await createOperatorLog({
      operatorId: user!.id,
      loadId: id,
      action: "LOAD_OPERATOR_NOTE_UPDATED",
      note: payload.operatorNote || null
    });

    return ok(load);
  } catch (error) {
    return fail("Operator qeydini saxlamaq alınmadı.", 400, parseZodError(error));
  }
}
