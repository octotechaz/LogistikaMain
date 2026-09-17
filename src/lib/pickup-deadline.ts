const BAKU_TIME_ZONE = "Asia/Baku";
const BAKU_UTC_OFFSET_HOURS = 4;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const pickupDeadlineRequiredMessage = "Ən gec götürülmə tarixini seçin.";
export const pickupDeadlinePastMessage = "Keçmiş tarix seçilə bilməz.";
export const pickupDeadlineMaxRangeMessage =
  "Ən gec götürülmə tarixi maksimum 30 gün sonrakı tarix ola bilər.";
export const maxPickupDeadlineDays = 30;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDateOnly(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

export function normalizePickupDeadlineDateValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

export function getBakuTodayDateString(baseDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BAKU_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(baseDate);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 0);

  return formatDateParts(year, month, day);
}

export function addDaysToDateString(dateString: string, days: number) {
  const parsed = parseDateOnly(dateString);

  if (!parsed) {
    return "";
  }

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export function getMaxPickupDeadlineDateString(baseDate = new Date()) {
  return addDaysToDateString(getBakuTodayDateString(baseDate), maxPickupDeadlineDays);
}

export function pickupDeadlineDateToDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function calculateExpiresAtFromPickupDeadline(value: string) {
  const nextDateString = addDaysToDateString(value, 1);
  const nextDateUtcMidnight = pickupDeadlineDateToDate(nextDateString);

  return new Date(
    nextDateUtcMidnight.getTime() - BAKU_UTC_OFFSET_HOURS * 60 * 60 * 1000
  );
}

export function validatePickupDeadlineDateValue(
  value: unknown,
  baseDate = new Date()
) {
  const normalized = normalizePickupDeadlineDateValue(value);

  if (!normalized) {
    return pickupDeadlineRequiredMessage;
  }

  const minDate = getBakuTodayDateString(baseDate);
  const maxDate = getMaxPickupDeadlineDateString(baseDate);

  if (normalized < minDate) {
    return pickupDeadlinePastMessage;
  }

  if (normalized > maxDate) {
    return pickupDeadlineMaxRangeMessage;
  }

  return null;
}

export function isExpiredByDate(expiresAt?: string | Date | null, baseDate = new Date()) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);

  if (Number.isNaN(expiresAtDate.getTime())) {
    return false;
  }

  return expiresAtDate.getTime() <= baseDate.getTime();
}

export function derivePickupDeadlineFromLegacyDuration(
  createdAt: string | Date,
  durationDays?: number | null
) {
  const baseDateString =
    normalizePickupDeadlineDateValue(createdAt) || getBakuTodayDateString();
  const days = typeof durationDays === "number" && Number.isFinite(durationDays)
    ? Math.max(durationDays - 1, 0)
    : 0;

  return addDaysToDateString(baseDateString, days);
}
