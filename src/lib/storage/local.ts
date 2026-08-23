import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { listingImageMaxFileSizeBytes } from "@/lib/listing-images";

const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const maxImageSize = 5 * 1024 * 1024;
const listingUploadFolders = new Set(["cargo-posts", "classified-loads"]);

function maxImageSizeForFolder(folder: string) {
  return listingUploadFolders.has(folder) ? listingImageMaxFileSizeBytes : maxImageSize;
}

function isAllowedImageFile(file: File) {
  if (allowedMimeTypes.has(file.type)) {
    return true;
  }

  if (!file.type) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    return allowedExtensions.has(extension);
  }

  return false;
}

export function assertAllowedImage(file: File, folder = "general") {
  if (!isAllowedImageFile(file)) {
    throw new Error("Yalnız jpg, png və webp şəkillər qəbul edilir.");
  }

  if (file.size > maxImageSizeForFolder(folder)) {
    if (listingUploadFolders.has(folder)) {
      throw new Error("Hər şəkilin ölçüsü maksimum 150 MB ola bilər.");
    }

    throw new Error("Şəkil ölçüsü maksimum 5MB ola bilər.");
  }
}

function resolveOctoAdminUploadsDir() {
  return path.join(process.cwd(), "octo-admin", "uploads");
}

function resolvePublicUploadsDir() {
  return path.join(process.cwd(), process.env.UPLOAD_DIR ?? "public/uploads");
}

/**
 * Listing images are stored flat as /uploads/<file>.webp so Next's
 * /uploads rewrite to Express (octo-admin) can serve them reliably.
 */
export async function saveLocalImage(file: File, folder = "general") {
  const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
  assertAllowedImage(file, safeFolder);

  const bytes = Buffer.from(await file.arrayBuffer());
  const isListingFolder = listingUploadFolders.has(safeFolder);
  const extension = isListingFolder
    ? "webp"
    : (file.name.split(".").pop()?.toLowerCase() ?? "jpg");
  const safeName = isListingFolder
    ? `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`
    : `${randomUUID()}.${extension}`;

  if (isListingFolder) {
    const adminDir = resolveOctoAdminUploadsDir();
    const publicDir = resolvePublicUploadsDir();
    await mkdir(adminDir, { recursive: true });
    await mkdir(publicDir, { recursive: true });

    const webpBuffer = await sharp(bytes)
      .rotate()
      .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const adminPath = path.join(adminDir, safeName);
    const publicPath = path.join(publicDir, safeName);
    await writeFile(adminPath, webpBuffer);
    try {
      await writeFile(publicPath, webpBuffer);
    } catch {
      // public mirror is best-effort
    }

    return {
      url: `/uploads/${safeName}`,
      mimeType: "image/webp",
      size: webpBuffer.length
    };
  }

  // Non-listing uploads:
  // - URLs are served via Next rewrite `/uploads/:path*` -> octo-admin Express.
  // - Therefore we must mirror into `octo-admin/uploads/<folder>/...` too,
  //   not only `public/uploads/<folder>/...`.
  const uploadRootPublic = process.env.UPLOAD_DIR ?? "public/uploads";
  const publicDir = path.join(process.cwd(), uploadRootPublic, safeFolder);
  const adminDir = path.join(resolveOctoAdminUploadsDir(), safeFolder);

  await mkdir(publicDir, { recursive: true });
  await mkdir(adminDir, { recursive: true });

  const publicPath = path.join(publicDir, safeName);
  const adminPath = path.join(adminDir, safeName);

  // Public mirror can be best-effort, but the admin mirror must succeed for
  // `/uploads/...` to work through the Express static route.
  await writeFile(adminPath, bytes);
  try {
    await writeFile(publicPath, bytes);
  } catch {
    // Ignore public mirror failures (display can still work via octo-admin).
  }

  return {
    url: `/uploads/${safeFolder}/${safeName}`,
    mimeType: file.type,
    size: file.size
  };
}
