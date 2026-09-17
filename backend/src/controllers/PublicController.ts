import type { Request, Response } from "express";
import { ApiResponse } from "../http/ApiResponse";
import { PublicCatalogService } from "../services/PublicCatalogService";

export class PublicController {
  constructor(private readonly publicCatalogService = new PublicCatalogService()) {}

  listings = async (_req: Request, res: Response) => ApiResponse.ok(res, await this.publicCatalogService.listings());

  listing = async (req: Request, res: Response) => {
    const listing = await this.publicCatalogService.listing(String(req.params.id));
    if (!listing) return ApiResponse.fail(res, "Elan tapılmadı.", 404);
    return ApiResponse.ok(res, listing);
  };

  categories = async (_req: Request, res: Response) => ApiResponse.ok(res, await this.publicCatalogService.categories(false));
}
