
import { fail, ok, requireApiUser } from "@/lib/api";
import { getMatchedDrivers } from "@/lib/operator-services";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  const { id } = await params;
  const drivers = await getMatchedDrivers(id);

  if (!drivers) {
    return fail("Yük tapılmadı.", 404);
  }

  return ok(drivers);
}
