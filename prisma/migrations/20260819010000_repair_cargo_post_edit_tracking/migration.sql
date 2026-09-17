-- Repair migration for databases where the edit-tracking migration was
-- skipped, partially applied, or incorrectly recorded as applied.
-- This is intentionally idempotent and does not modify existing data.
ALTER TABLE "CargoPost"
  ADD COLUMN IF NOT EXISTS "lastEditedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "editSnapshot" JSONB;
