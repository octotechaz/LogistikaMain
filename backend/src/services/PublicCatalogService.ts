import { z } from "zod";
import { prisma } from "../prisma";

const categorySchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  iconKey: z.string().trim().default("boxes"),
  iconTone: z.string().trim().default("text-slate-500"),
  matchCargoType: z.string().trim().optional().or(z.literal("")),
  matchVehicleType: z.string().trim().optional().or(z.literal("")),
  matchKeyword: z.string().trim().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true)
});

export interface CategoryDto {
  id: string;
  legacySqliteId: string;
  label: string;
  iconKey: string;
  iconTone: string;
  matchCargoType: string | null;
  matchVehicleType: string | null;
  matchKeyword: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ICategoryRepository {
  findMany(opts: { includeInactive: boolean }): Promise<CategoryDto[]>;
  upsert(input: {
    id: string;
    label: string;
    iconKey: string;
    iconTone: string;
    matchCargoType: string | null;
    matchVehicleType: string | null;
    matchKeyword: string | null;
    sortOrder: number;
    isActive: boolean;
  }): Promise<CategoryDto>;
  delete(id: string): Promise<void>;
}

export interface IListingRepository {
  findMany(args: unknown): Promise<Record<string, any>[]>;
  findFirst(args: unknown): Promise<Record<string, any> | null>;
}

function makeDefaultListingRepository(): IListingRepository {
  return {
    findMany: (args) => prisma.cargoPost.findMany(args as never) as Promise<Record<string, any>[]>,
    findFirst: (args) => prisma.cargoPost.findFirst(args as never) as Promise<Record<string, any> | null>,
  };
}

function makeDefaultCategoryRepository(): ICategoryRepository {
  // Lazy import to avoid top-level side effects; loaded only when the default
  // repository is actually used (i.e. not in tests that inject a mock).
  return {
    async findMany(opts) {
      const { listPublicCategories } = await import("../../../src/lib/public-catalog-repository.js");
      return listPublicCategories({ includeInactive: opts.includeInactive }) as Promise<CategoryDto[]>;
    },
    async upsert(input) {
      const { upsertPublicCategory } = await import("../../../src/lib/public-catalog-repository.js");
      return upsertPublicCategory(input) as Promise<CategoryDto>;
    },
    async delete(id) {
      const { deletePublicCategory } = await import("../../../src/lib/public-catalog-repository.js");
      await deletePublicCategory(id);
    },
  };
}

export class PublicCatalogService {
  private categoryRepo: ICategoryRepository;
  private listingRepo: IListingRepository;

  constructor(categoryRepo?: ICategoryRepository, listingRepo?: IListingRepository) {
    this.categoryRepo = categoryRepo ?? makeDefaultCategoryRepository();
    this.listingRepo = listingRepo ?? makeDefaultListingRepository();
  }

  async listings() {
    const rows = await this.listingRepo.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { firstName: true, lastName: true, phone: true } },
        images: { where: { category: "CARGO" }, select: { url: true } },
      },
    });
    return rows.map((row) => this.mapListing(row));
  }

  async listing(id: string) {
    const row = await this.listingRepo.findFirst({
      where: { id, status: "ACTIVE" },
      include: {
        owner: { select: { firstName: true, lastName: true, phone: true } },
        images: { where: { category: "CARGO" }, select: { url: true } },
      },
    });
    return row ? this.mapListing(row) : null;
  }

  async categories(includeInactive = false): Promise<CategoryDto[]> {
    return this.categoryRepo.findMany({ includeInactive });
  }

  async upsertCategory(input: unknown): Promise<CategoryDto> {
    const parsed = categorySchema.parse(input);
    return this.categoryRepo.upsert({
      id: parsed.id,
      label: parsed.label,
      iconKey: parsed.iconKey,
      iconTone: parsed.iconTone,
      matchCargoType: parsed.matchCargoType || null,
      matchVehicleType: parsed.matchVehicleType || null,
      matchKeyword: parsed.matchKeyword || null,
      sortOrder: parsed.sortOrder,
      isActive: parsed.isActive,
    });
  }

  async deleteCategory(id: string): Promise<{ deleted: true }> {
    await this.categoryRepo.delete(id);
    return { deleted: true };
  }

  private mapListing(row: Record<string, unknown>) {
    const images = Array.isArray(row.images) ? row.images as Array<{ url?: string }> : [];
    const imageUrls = images.map((image) => image.url || "").filter(Boolean);
    const owner = row.owner as { firstName?: string; lastName?: string; phone?: string } | undefined;
    const iso = (value: unknown) => value instanceof Date ? value.toISOString() : value ?? undefined;
    const numberOrUndefined = (value: unknown) => value == null ? undefined : Number(value);

    return {
      id: row.id,
      ownerId: row.ownerId,
      ownerName: [owner?.firstName, owner?.lastName].filter(Boolean).join(" "),
      ownerPhone: owner?.phone,
      title: row.cargoName,
      cargoType: row.cargoType,
      description: row.description,
      weight: row.weight,
      volume: row.volume ?? undefined,
      length: row.length ?? undefined,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      quantity: row.quantity ?? "",
      pickupCity: row.pickupCity,
      pickupAddress: row.pickupAddress,
      deliveryCity: row.deliveryCity,
      deliveryAddress: row.deliveryAddress,
      pickupDate: iso(row.pickupDate),
      pickupDeadlineDate: iso(row.pickupDeadlineDate),
      pickupTime: row.legacyPickupTime ?? undefined,
      vehicleType: row.requiredVehicleType ?? undefined,
      price: numberOrUndefined(row.proposedPrice),
      note: row.legacyNote ?? undefined,
      createdAt: iso(row.createdAt),
      approvedAt: null,
      expiresAt: row.expiresAt === null ? null : iso(row.expiresAt),
      status: row.status,
      photo: imageUrls[0] ?? "",
      photos: imageUrls
    };
  }
}
