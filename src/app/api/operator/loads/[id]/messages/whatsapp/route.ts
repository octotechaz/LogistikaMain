
import { fail, ok, requireApiUser } from "@/lib/api";
import { buildMessageResponse } from "@/lib/operator-services";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  const url = new URL(request.url);
  const targetType = url.searchParams.get("targetType");
  const targetId = url.searchParams.get("targetId");

  if ((targetType !== "driver" && targetType !== "dispatcher") || !targetId) {
    return fail("targetType və targetId düzgün göndərilməlidir.", 400);
  }

  const { id } = await params;
  const message = await buildMessageResponse(id, "whatsapp", targetType, targetId);

  if (!message) {
    return fail("Yük və ya hədəf tapılmadı.", 404);
  }

  return ok(message);
}
