import { saveLocalImage } from "@/lib/storage/local";

export type UploadedImage = {
  url: string;
  mimeType: string;
  size: number;
};

export async function uploadImage(file: File, folder: string): Promise<UploadedImage> {
  return saveLocalImage(file, folder);
}
