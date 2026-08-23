-- AddColumn: legacySqliteId to User
ALTER TABLE "User" ADD COLUMN "legacySqliteId" INTEGER;

-- AddColumn: legacySqliteId to CargoPost
ALTER TABLE "CargoPost" ADD COLUMN "legacySqliteId" INTEGER;

-- AddColumn: legacySqliteId to Image
ALTER TABLE "Image" ADD COLUMN "legacySqliteId" INTEGER;

-- CreateUniqueIndex: User_legacySqliteId_key
CREATE UNIQUE INDEX IF NOT EXISTS "User_legacySqliteId_key" ON "User"("legacySqliteId");

-- CreateUniqueIndex: CargoPost_legacySqliteId_key
CREATE UNIQUE INDEX IF NOT EXISTS "CargoPost_legacySqliteId_key" ON "CargoPost"("legacySqliteId");

-- CreateUniqueIndex: Image_legacySqliteId_key
CREATE UNIQUE INDEX IF NOT EXISTS "Image_legacySqliteId_key" ON "Image"("legacySqliteId");

-- CreateTable: PublicCategory
CREATE TABLE "PublicCategory" (
    "id" TEXT NOT NULL,
    "legacySqliteId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "iconTone" TEXT NOT NULL DEFAULT 'text-slate-500',
    "matchCargoType" TEXT,
    "matchVehicleType" TEXT,
    "matchKeyword" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicCategory_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex: PublicCategory_legacySqliteId_key
CREATE UNIQUE INDEX IF NOT EXISTS "PublicCategory_legacySqliteId_key" ON "PublicCategory"("legacySqliteId");

-- CreateIndex: PublicCategory_isActive_sortOrder_idx
CREATE INDEX IF NOT EXISTS "PublicCategory_isActive_sortOrder_idx" ON "PublicCategory"("isActive", "sortOrder");

-- AddColumn: legacyAdminStatus to CargoPost
ALTER TABLE "CargoPost" ADD COLUMN IF NOT EXISTS "legacyAdminStatus" TEXT NOT NULL DEFAULT 'APPROVED';