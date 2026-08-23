export { runSmartMatching, MATCH_MIN_SCORE } from "./run";
export { isEligible, computeMatchScore } from "./scoring";
export type { EligibleDriver, ScoreBreakdown } from "./scoring";
export { sendMatchNotification, hasNotifiedDriver } from "./notify";
export { buildDriverMatchMessage } from "./message";
export type { MatchMessageDetails } from "./message";
export { resolveCoordinates, distanceKm, approximateRoadDistanceKm } from "./geo";
