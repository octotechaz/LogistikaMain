
import { z } from "zod";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  companyName: z.string().trim().optional().or(z.literal("")),
  voen: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal(""))
});

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER"]);

  if (response) return response;
  if (!user?.cargoOwnerProfile) return fail("Yük verən profili tapılmadı.", 404);

  return ok(user.cargoOwnerProfile);
}

export async function PATCH(request: Request) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER"]);

  if (response) return response;
  if (!user?.cargoOwnerProfile) return fail("Yük verən profili tapılmadı.", 404);

  try {
    const payload = profileSchema.parse(await request.json());
    const profile = await prisma.cargoOwnerProfile.update({
      where: { id: user.cargoOwnerProfile.id },
      data: {
        companyName: payload.companyName || null,
        voen: payload.voen || null,
        city: payload.city || null
      }
    });

    if (payload.companyName !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { companyName: payload.companyName || null }
      });
    }

    return ok(profile);
  } catch (error) {
    return fail("Profil məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
