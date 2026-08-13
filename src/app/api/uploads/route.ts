
import { ImageCategory } from "@prisma/client";
import { fail, ok, requireApiUser } from "@/lib/api";
import { uploadImage } from "@/lib/upload";

export const runtime = "nodejs";
export const maxDuration = 120;

const folderToCategory: Record<string, ImageCategory> = {
  profiles: "PROFILE",
  vehicles: "VEHICLE",
  "vehicle-documents": "VEHICLE_DOCUMENT",
  "cargo-posts": "CARGO",
  "classified-loads": "CARGO"
};

const publicUploadFolders = new Set(["classified-loads"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "general");

    if (!(file instanceof File)) {
      return fail("Şəkil faylı göndərilməyib.", 400);
    }

    if (!publicUploadFolders.has(folder)) {
      const { user, response } = await requireApiUser(request, ["CARRIER", "CARGO_OWNER", "ADMIN"]);

      if (response) {
        return response;
      }

      if (!user) {
        return fail("Giriş tələb olunur.", 401);
      }
    }

    const saved = await uploadImage(file, folder);

    return ok({
      ...saved,
      category: folderToCategory[folder] ?? "PROFILE"
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Şəkil yüklənmədi.", 400);
  }
}
