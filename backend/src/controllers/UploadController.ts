import type { Request, Response } from "express";
import { ApiResponse } from "../http/ApiResponse";
import { UploadService } from "../services/UploadService";

export class UploadController {
  constructor(private readonly uploadService = new UploadService()) {}

  upload = async (req: Request, res: Response) => {
    if (!req.file) {
      return ApiResponse.fail(res, "Şəkil faylı göndərilməyib.", 400);
    }

    return ApiResponse.ok(res, await this.uploadService.save(req.file, String(req.body.folder || "general")), 201);
  };
}
