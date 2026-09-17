-- Migration: add legacy vehicle parity fields to User
-- Non-destructive: both columns are nullable, no existing data is affected.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "legacyVehicleType" TEXT,
  ADD COLUMN IF NOT EXISTS "legacyCapacity"    DOUBLE PRECISION;