import type { CargoPost, DriverProfile } from "@prisma/client";
import { normalizeCity, parseRouteTokens, resolveCoordinates, distanceKm, approximateRoadDistanceKm } from "./geo";

/** The subset of the driver's user we actually read (must include status). */
export type MatchDriverUser = {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type EligibleDriver = DriverProfile & { user: MatchDriverUser };

/**
 * Hard eligibility gates — a driver must pass ALL of these to be considered.
 * These mirror the mandatory business rules (type, capacity, availability, consent).
 */
export function isEligible(driver: EligibleDriver, cargo: Pick<CargoPost, "requiredVehicleType" | "weight" | "volume">) {
  if (driver.status !== "ACTIVE") {
    return false;
  }

  if (driver.user.status !== "ACTIVE") {
    return false;
  }

  if (!driver.consentToReceiveOffers) {
    return false;
  }

  // Driver must accept WhatsApp notifications.
  const channels = (driver.notificationChannels ?? []).map((channel) => channel.toLocaleLowerCase("az"));
  if (channels.length > 0 && !channels.some((channel) => channel.includes("whatsapp"))) {
    return false;
  }

  if (!driver.whatsappPhone?.trim()) {
    return false;
  }

  // Vehicle type must match exactly (as defined on the cargo post).
  if (normalizeCity(driver.vehicleType) !== normalizeCity(cargo.requiredVehicleType)) {
    return false;
  }

  // Capacity must cover the cargo weight. weight is stored in kg, capacity in tons.
  const capacityKg = driver.capacityTons * 1000;
  if (capacityKg < cargo.weight) {
    return false;
  }

  // Volume must fit the body volume (m³). Volume is optional on the cargo.
  const bodyVolume = driver.bodyLength * driver.bodyWidth * driver.bodyHeight;
  if (cargo.volume && bodyVolume > 0 && bodyVolume < cargo.volume) {
    return false;
  }

  return true;
}

const MAX_SCORE = 100;

export type ScoreBreakdown = {
  total: number;
  route: number;
  distance: number;
  capacity: number;
  volume: number;
  vehicleType: number;
  date: number;
  activity: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute a 0-100 compatibility score for a single driver against a cargo post.
 * Higher is better. Only drivers meeting eligibility gates reach this point.
 */
export function computeMatchScore(
  driver: EligibleDriver,
  cargo: Pick<CargoPost, "pickupCity" | "deliveryCity" | "weight" | "volume" | "pickupDate" | "requiredVehicleType">
): ScoreBreakdown {
  const pickup = resolveCoordinates(cargo.pickupCity);
  const driverHome = resolveCoordinates(driver.city);

  // 1. Route / route-zone compatibility (max 30).
  let routeScore = 0;
  const pickupNorm = normalizeCity(cargo.pickupCity);
  const deliveryNorm = normalizeCity(cargo.deliveryCity);
  const routeTokens = new Set<string>();

  for (const route of driver.routes ?? []) {
    for (const token of parseRouteTokens(route)) {
      if (token) {
        routeTokens.add(token);
      }
    }
  }

  const hasPickup = routeTokens.has(pickupNorm);
  const hasDelivery = routeTokens.has(deliveryNorm);

  if (hasPickup && hasDelivery) {
    routeScore = 30; // Route covers both endpoints.
  } else if (hasPickup || hasDelivery) {
    routeScore = 18; // Covers one endpoint — partial fit.
  } else {
    routeScore = 6; // No route match, rely on proximity.
  }

  // 2. Distance to pickup (max 25). Closer driver home = better.
  let distanceScore = 0;
  let distanceToPickupKm: number | null = null;

  if (driverHome && pickup) {
    distanceToPickupKm = distanceKm(driverHome, pickup);
    // 0 km => 25; 250+ km => 0.
    distanceScore = Math.round(clamp((1 - distanceToPickupKm / 250) * 25, 0, 25));
  } else {
    distanceScore = 8; // Unknown location — neutral.
  }

  // 3. Capacity fit (max 15). Closer capacity-to-weight ratio = ideal.
  let capacityScore = 0;
  const capacityKg = driver.capacityTons * 1000;
  const utilization = cargo.weight / capacityKg; // 0..1
  if (utilization >= 0.7 && utilization <= 1) {
    capacityScore = 15;
  } else if (utilization >= 0.45) {
    capacityScore = 12;
  } else {
    capacityScore = 8;
  }

  // 4. Volume fit (max 10).
  let volumeScore = 0;
  const bodyVolume = driver.bodyLength * driver.bodyWidth * driver.bodyHeight;
  if (!cargo.volume || bodyVolume <= 0) {
    volumeScore = 6;
  } else {
    const volumeRatio = cargo.volume / bodyVolume;
    if (volumeRatio <= 1 && volumeRatio >= 0.6) {
      volumeScore = 10;
    } else if (volumeRatio < 0.6) {
      volumeScore = 7;
    } else {
      volumeScore = 2;
    }
  }

  // 5. Vehicle type (max 10). Exact match already gated; award full points.
  const vehicleTypeScore = 10;

  // 6. Pickup date availability vs working days (max 5).
  let dateScore = 0;
  const pickupWeekday = cargo.pickupDate?.toLocaleDateString("en-US", { weekday: "long" });
  const workingDays = (driver.workingDays ?? []).map((day) => day.toLocaleLowerCase("az"));

  if (!pickupWeekday) {
    dateScore = 3;
  } else {
    const weekdayNorm = pickupWeekday.toLocaleLowerCase("az");
    if (workingDays.length === 0 || workingDays.includes(weekdayNorm)) {
      dateScore = 5;
    } else {
      dateScore = 1;
    }
  }

  // 7. Driver activity (max 5).
  const activityScore = clamp(driver.activityScore ?? 0, 0, 100) > 0
    ? Math.round(clamp((driver.activityScore ?? 0) / 100, 0, 1) * 5)
    : 2;

  const total = clamp(
    routeScore + distanceScore + capacityScore + volumeScore + vehicleTypeScore + dateScore + activityScore,
    0,
    MAX_SCORE
  );

  return {
    total,
    route: routeScore,
    distance: distanceScore,
    capacity: capacityScore,
    volume: volumeScore,
    vehicleType: vehicleTypeScore,
    date: dateScore,
    activity: activityScore
  };
}

export function formatDistanceKm(straightLineKm: number | null) {
  if (straightLineKm === null || Number.isNaN(straightLineKm)) {
    return null;
  }
  return approximateRoadDistanceKm(straightLineKm);
}
