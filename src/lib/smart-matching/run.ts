import "server-only";

import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";
import { isEligible, computeMatchScore, formatDistanceKm, type EligibleDriver } from "./scoring";
import { buildDriverMatchMessage } from "./message";
import { sendMatchNotification } from "./notify";
import { resolveCoordinates, distanceKm } from "./geo";

/** Minimum total score required for a driver to be notified. */
export const MATCH_MIN_SCORE = 45;

export type SmartMatchResult = {
  cargoPostId: string;
  candidates: number;
  matched: number;
  notified: number;
  failed: number;
  skipped: number;
};

function toNumber(value?: { toString(): string } | number | null) {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value.toString());
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Run smart matching for a single cargo post:
 *  1. Fetch the approved cargo post.
 *  2. Fetch all active drivers with consent for WhatsApp.
 *  3. Apply eligibility gates.
 *  4. Compute compatibility scores.
 *  5. Notify only those above the minimum score threshold.
 *  6. Persist notification status (dedup + failure logging).
 *
 * Never throws — callers may invoke it fire-and-forget.
 */
export async function runSmartMatching(cargoPostId: string): Promise<SmartMatchResult | null> {
  const result: SmartMatchResult = {
    cargoPostId,
    candidates: 0,
    matched: 0,
    notified: 0,
    failed: 0,
    skipped: 0
  };

  try {
    const cargo = await prisma.cargoPost.findUnique({
      where: { id: cargoPostId },
      select: {
        id: true,
        legacySqliteId: true,
        cargoName: true,
        cargoType: true,
        pickupCity: true,
        pickupAddress: true,
        deliveryCity: true,
        deliveryAddress: true,
        weight: true,
        volume: true,
        pickupDate: true,
        legacyPickupTime: true,
        requiredVehicleType: true,
        proposedPrice: true,
        priceNegotiable: true
      }
    });

    if (!cargo) {
      return null;
    }

    const drivers = await prisma.driverProfile.findMany({
      where: {
        status: "ACTIVE",
        user: { status: "ACTIVE" },
        consentToReceiveOffers: true,
        whatsappPhone: { not: "" }
      },
      include: { user: { select: publicUserSelect } }
    });

    result.candidates = drivers.length;

    const pickupCoords = resolveCoordinates(cargo.pickupCity);

    // Precompute eligible + scored drivers.
    const scored: Array<{ driver: EligibleDriver; score: number; distanceKm: number | null }> = [];

    for (const driver of drivers) {
      if (!isEligible(driver, cargo)) {
        continue;
      }

      const breakdown = computeMatchScore(driver, cargo);

      let roadDistanceKm: number | null = null;
      const homeCoords = resolveCoordinates(driver.city);
      if (pickupCoords && homeCoords) {
        roadDistanceKm = formatDistanceKm(distanceKm(pickupCoords, homeCoords));
      }

      scored.push({ driver, score: breakdown.total, distanceKm: roadDistanceKm });
    }

    // Sort by score desc.
    scored.sort((a, b) => b.score - a.score);

    result.matched = scored.length;

    // Notify only drivers meeting the threshold.
    const toNotify = scored.filter((entry) => entry.score >= MATCH_MIN_SCORE);

    for (const entry of toNotify) {
      const driver = entry.driver;
      const message = buildDriverMatchMessage({
        cargoPostId: cargo.id,
        listingId: cargo.legacySqliteId ?? cargo.id,
        cargoName: cargo.cargoName,
        cargoType: cargo.cargoType,
        pickupCity: cargo.pickupCity,
        pickupAddress: cargo.pickupAddress,
        deliveryCity: cargo.deliveryCity,
        deliveryAddress: cargo.deliveryAddress,
        weight: cargo.weight,
        volume: cargo.volume ?? null,
        pickupDate: cargo.pickupDate,
        pickupTime: cargo.legacyPickupTime,
        requiredVehicleType: cargo.requiredVehicleType,
        proposedPrice: toNumber(cargo.proposedPrice),
        priceNegotiable: cargo.priceNegotiable,
        distanceKm: entry.distanceKm
      });

      const outcome = await sendMatchNotification({
        cargoPostId: cargo.id,
        driverId: driver.id,
        phone: driver.whatsappPhone,
        score: entry.score,
        message
      });

      if (outcome === null) {
        result.skipped += 1;
      } else if (outcome.status === "SENT") {
        result.notified += 1;
      } else if (outcome.status === "FAILED") {
        result.failed += 1;
      } else {
        result.skipped += 1;
      }
    }

    console.log(
      `[SmartMatching] cargo=${cargo.id} candidates=${result.candidates} matched=${result.matched} notified=${result.notified} failed=${result.failed}`
    );

    return result;
  } catch (error) {
    console.error("[SmartMatching] xətası:", error);
    return result;
  }
}
