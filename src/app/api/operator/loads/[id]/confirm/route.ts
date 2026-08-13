
import { LoadStatus } from "@prisma/client";
import { ok, requireApiUser } from "@/lib/api";
import { createOperatorLog } from "@/lib/operator-services";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  const { id } = await params;
  const load = await prisma.load.update({
    where: { id },
    data: {
      status: LoadStatus.CONFIRMED,
      operatorId: user!.id
    }
  });

  await createOperatorLog({
    operatorId: user!.id,
    loadId: id,
    action: "LOAD_CONFIRMED"
  });

  return ok(load);
}
