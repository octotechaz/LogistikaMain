import "server-only";

import { MatchNotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseAdminPhones } from "@/lib/admin-whatsapp-notify";

/**
 * Notification dispatch + dedup + persistence for smart matching.
 *
 * - Deduplicates: never notifies the same driver twice for the same cargo post
 *   (enforced by the unique (cargoPostId, driverId) constraint).
 * - Sends via the shared backend Baileys WhatsApp endpoint.
 * - Logs every outcome (SENT / FAILED / SKIPPED) with score, message and error.
 */

function backendUrl() {
  return process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:4001";
}

/** Check whether this driver already received a notification for this cargo post. */
export async function hasNotifiedDriver(cargoPostId: string, driverId: string) {
  const existing = await prisma.cargoMatchNotification.findUnique({
    where: { cargoPostId_driverId: { cargoPostId, driverId } },
    select: { id: true }
  });

  return existing !== null;
}

export type SendMatchResult = {
  status: MatchNotificationStatus;
  error?: string;
};

async function recordNotification(input: {
  cargoPostId: string;
  driverId: string;
  score: number;
  status: MatchNotificationStatus;
  messageText?: string | null;
  error?: string | null;
}) {
  try {
    await prisma.cargoMatchNotification.upsert({
      where: { cargoPostId_driverId: { cargoPostId: input.cargoPostId, driverId: input.driverId } },
      create: {
        cargoPostId: input.cargoPostId,
        driverId: input.driverId,
        score: input.score,
        channel: "WHATSAPP",
        status: input.status,
        messageText: input.messageText ?? null,
        error: input.error ?? null,
        sentAt: input.status === "SENT" ? new Date() : null
      },
      update: {
        // Keep the first send outcome; do not overwrite a successful delivery with a later duplicate attempt.
        ...(input.status === "SENT"
          ? { sentAt: new Date(), status: "SENT" as const, error: null }
          : {})
      }
    });
  } catch (error) {
    console.error("Match notification log kaydedilemedi:", error);
  }
}

/**
 * Send a WhatsApp message to one matched driver and persist the outcome.
 * Returns `null` if the driver was already notified (dedup).
 */
export async function sendMatchNotification(input: {
  cargoPostId: string;
  driverId: string;
  phone: string;
  score: number;
  message: string;
}): Promise<SendMatchResult | null> {
  const alreadyNotified = await hasNotifiedDriver(input.cargoPostId, input.driverId);
  if (alreadyNotified) {
    return null;
  }

  const phones = parseAdminPhones(input.phone);
  if (phones.length === 0) {
    await recordNotification({
      cargoPostId: input.cargoPostId,
      driverId: input.driverId,
      score: input.score,
      status: "SKIPPED",
      error: "WhatsApp nömrəsi düzgün deyil"
    });
    return { status: "SKIPPED", error: "WhatsApp nömrəsi düzgün deyil" };
  }

  try {
    const response = await fetch(`${backendUrl()}/api/whatsapp/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phones: [phones[0]], message: input.message })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      const error = payload?.error || `WhatsApp göndərmə uğursuz oldu (${response.status})`;

      await recordNotification({
        cargoPostId: input.cargoPostId,
        driverId: input.driverId,
        score: input.score,
        status: "FAILED",
        error,
        messageText: input.message
      });

      return { status: "FAILED", error };
    }

    await recordNotification({
      cargoPostId: input.cargoPostId,
      driverId: input.driverId,
      score: input.score,
      status: "SENT",
      messageText: input.message
    });

    return { status: "SENT" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinməyən xəta";

    await recordNotification({
      cargoPostId: input.cargoPostId,
      driverId: input.driverId,
      score: input.score,
      status: "FAILED",
      error: message,
      messageText: input.message
    });

    return { status: "FAILED", error: message };
  }
}
