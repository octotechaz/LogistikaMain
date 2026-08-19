-- Migration: cargo post edit tracking (owner 24h edit limit + admin diff review)
-- Additive only. `lastEditedAt` tracks last owner edit time for the 24h rule.
-- `editSnapshot` holds the pre-edit field values + image urls so the admin
-- panel can render a diff of which fields changed (old -> new).

ALTER TABLE "CargoPost"
  ADD COLUMN IF NOT EXISTS "lastEditedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "editSnapshot" JSONB;
