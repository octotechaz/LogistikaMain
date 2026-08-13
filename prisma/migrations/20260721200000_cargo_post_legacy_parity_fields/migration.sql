-- AddColumn: legacyPickupTime to CargoPost (nullable text)
ALTER TABLE "CargoPost" ADD COLUMN "legacyPickupTime" TEXT;

-- AddColumn: legacyNote to CargoPost (nullable text)
ALTER TABLE "CargoPost" ADD COLUMN "legacyNote" TEXT;

-- AddColumn: legacyViewCount to CargoPost (not null integer, default 0)
ALTER TABLE "CargoPost" ADD COLUMN "legacyViewCount" INTEGER NOT NULL DEFAULT 0;