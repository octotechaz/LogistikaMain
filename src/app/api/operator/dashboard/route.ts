
import { ok, requireApiUser } from "@/lib/api";
import { getOperatorKpis } from "@/lib/operator-services";

export async function GET(request: Request) {
  const { response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  return ok(await getOperatorKpis());
}
