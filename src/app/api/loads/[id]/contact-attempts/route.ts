
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { recordContactAttempt } from "@/lib/operator-services";
import { contactAttemptSchema } from "@/lib/validations/operator-load";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["OPERATOR", "ADMIN"]);

  if (response) return response;

  try {
    const { id } = await params;
    const payload = contactAttemptSchema.parse(await request.json());

    const attempt = await recordContactAttempt({
      loadId: id,
      operatorId: user!.id,
      driverId: payload.driverId || null,
      dispatcherId: payload.dispatcherId || null,
      channel: payload.channel,
      responseStatus: payload.responseStatus || null,
      messageText: payload.messageText,
      note: payload.note || null
    });

    return ok(attempt, { status: 201 });
  } catch (error) {
    return fail("Əlaqə nəticəsini yazmaq alınmadı.", 400, parseZodError(error));
  }
}
