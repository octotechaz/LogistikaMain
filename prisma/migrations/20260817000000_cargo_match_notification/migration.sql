-- Migration: add CargoMatchNotification for smart-matching WhatsApp dedup + logging
-- Additive only — no existing tables modified.

CREATE TYPE "MatchNotificationStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "MatchNotificationChannel" AS ENUM ('WHATSAPP');

CREATE TABLE "CargoMatchNotification" (
    "id"          TEXT        NOT NULL,
    "cargoPostId" TEXT        NOT NULL,
    "driverId"    TEXT        NOT NULL,
    "score"       INTEGER     NOT NULL,
    "channel"     "MatchNotificationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "status"      "MatchNotificationStatus"  NOT NULL DEFAULT 'SENT',
    "messageText" TEXT,
    "error"       TEXT,
    "sentAt"      TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargoMatchNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CargoMatchNotification_cargoPostId_driverId_key" ON "CargoMatchNotification"("cargoPostId", "driverId");
CREATE INDEX "CargoMatchNotification_cargoPostId_idx" ON "CargoMatchNotification"("cargoPostId");
CREATE INDEX "CargoMatchNotification_driverId_idx" ON "CargoMatchNotification"("driverId");
CREATE INDEX "CargoMatchNotification_status_idx" ON "CargoMatchNotification"("status");
CREATE INDEX "CargoMatchNotification_sentAt_idx" ON "CargoMatchNotification"("sentAt");