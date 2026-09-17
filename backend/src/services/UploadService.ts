import fs from "node:fs/promises";
import path from "node:path";
import type { Express } from "express";
import { config } from "../config";

export class UploadService {
  async save(file: Express.Multer.File, folder = "general") {
    const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
    const uploadRoot = path.resolve(process.cwd(), config.uploadDir, safeFolder);
    await fs.mkdir(uploadRoot, { recursive: true });

    const extension = path.extname(file.originalname) || ".bin";
    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;
    const absolutePath = path.join(uploadRoot, filename);
    await fs.writeFile(absolutePath, file.buffer);

    const publicUrl = `/uploads/${safeFolder}/${filename}`;
    return {
      url: publicUrl,
      fileName: filename,
      size: file.size,
      mimeType: file.mimetype
    };
  }
}
