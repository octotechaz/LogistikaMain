export const quantityOrDimensionsRequiredMessage =
  "Say daxil edin və ya yükün uzunluq, en və hündürlük ölçülərini tam doldurun.";

export const quantityOrCompleteDimensionsMessage =
  "Həcmin hesablanması üçün uzunluq, en və hündürlük sahələrinin hamısını doldurun və ya Say daxil edin.";

export const quantityPositiveIntegerMessage =
  "Say sahəsinə 1 və ya daha böyük tam ədəd daxil edin.";

export const positiveMeasurementMessage =
  "Dəyər 0-dan böyük olmalıdır.";

export type CargoMeasurementFields = {
  quantity?: unknown;
  length?: unknown;
  width?: unknown;
  height?: unknown;
};

export type CargoMeasurementValidationResult = {
  canSubmit: boolean;
  quantity: number | null;
  quantityText: string;
  length: number | null;
  width: number | null;
  height: number | null;
  volume: number | null;
  hasAnyDimension: boolean;
  hasAllDimensions: boolean;
  quantityValid: boolean;
  volumeValid: boolean;
  quantityError?: string;
  lengthError?: string;
  widthError?: string;
  heightError?: string;
  formError?: string;
};

function normalizeRawValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function normalizeNumericInput(value: string) {
  return value.replace(/,/g, ".").replace(/\s+/g, "");
}

export function parsePositiveDecimal(value: unknown) {
  const normalized = normalizeNumericInput(normalizeRawValue(value));

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parsePositiveInteger(value: unknown) {
  const normalized = normalizeNumericInput(normalizeRawValue(value));

  if (!normalized) {
    return null;
  }

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function normalizeQuantityValue(value: unknown) {
  const parsed = parsePositiveInteger(value);

  if (parsed !== null) {
    return String(parsed);
  }

  const raw = normalizeRawValue(value);
  const matched = raw.match(/^(\d+)\s*(ədəd|eded|əd\.)?$/i);

  if (!matched) {
    return "";
  }

  const extracted = Number(matched[1]);
  return Number.isSafeInteger(extracted) && extracted > 0 ? String(extracted) : "";
}

export function formatMeasurementNumber(value: unknown, maxFractionDigits = 3) {
  const numeric =
    typeof value === "number" ? value : typeof value === "string" ? Number(normalizeNumericInput(value)) : Number(value);

  if (!Number.isFinite(numeric)) {
    return "";
  }

  return numeric
    .toFixed(maxFractionDigits)
    .replace(/\.?0+$/, "");
}

export function calculateVolumeFromDimensions(length: unknown, width: unknown, height: unknown) {
  const parsedLength = parsePositiveDecimal(length);
  const parsedWidth = parsePositiveDecimal(width);
  const parsedHeight = parsePositiveDecimal(height);

  if (parsedLength === null || parsedWidth === null || parsedHeight === null) {
    return null;
  }

  const volume = parsedLength * parsedWidth * parsedHeight;

  if (!Number.isFinite(volume) || volume <= 0) {
    return null;
  }

  return Number(volume.toFixed(6));
}

export function formatVolume(value: unknown) {
  return formatMeasurementNumber(value, 3);
}

export function resolveVolumeValue(
  volume: unknown,
  length: unknown,
  width: unknown,
  height: unknown
) {
  return calculateVolumeFromDimensions(length, width, height) ?? parsePositiveDecimal(volume);
}

export function formatDimensions(length: unknown, width: unknown, height: unknown) {
  const lengthValue = formatMeasurementNumber(length, 3);
  const widthValue = formatMeasurementNumber(width, 3);
  const heightValue = formatMeasurementNumber(height, 3);

  if (!lengthValue || !widthValue || !heightValue) {
    return "";
  }

  return `${lengthValue} × ${widthValue} × ${heightValue} m`;
}

export function formatQuantity(value: unknown) {
  const normalized = normalizeQuantityValue(value);

  if (!normalized) {
    return "";
  }

  return `${normalized} ədəd`;
}

export function validateCargoMeasurements({
  quantity,
  length,
  width,
  height
}: CargoMeasurementFields): CargoMeasurementValidationResult {
  const rawQuantity = normalizeRawValue(quantity);
  const rawLength = normalizeRawValue(length);
  const rawWidth = normalizeRawValue(width);
  const rawHeight = normalizeRawValue(height);

  const quantityValue = parsePositiveInteger(rawQuantity);
  const lengthValue = parsePositiveDecimal(rawLength);
  const widthValue = parsePositiveDecimal(rawWidth);
  const heightValue = parsePositiveDecimal(rawHeight);

  const quantityProvided = rawQuantity !== "";
  const hasAnyDimension = rawLength !== "" || rawWidth !== "" || rawHeight !== "";
  const hasAllDimensions = rawLength !== "" && rawWidth !== "" && rawHeight !== "";

  const quantityError = quantityProvided && quantityValue === null ? quantityPositiveIntegerMessage : undefined;
  const lengthError = rawLength !== "" && lengthValue === null ? positiveMeasurementMessage : undefined;
  const widthError = rawWidth !== "" && widthValue === null ? positiveMeasurementMessage : undefined;
  const heightError = rawHeight !== "" && heightValue === null ? positiveMeasurementMessage : undefined;

  const volume = calculateVolumeFromDimensions(rawLength, rawWidth, rawHeight);
  const quantityValid = quantityValue !== null;
  const volumeValid = volume !== null && volume > 0;

  let formError: string | undefined;

  if (!quantityValid && !volumeValid) {
    if (hasAnyDimension && !hasAllDimensions && !quantityProvided) {
      formError = quantityOrCompleteDimensionsMessage;
    } else if (!quantityProvided) {
      formError = quantityOrDimensionsRequiredMessage;
    }
  }

  const hasFieldErrors = Boolean(quantityError || lengthError || widthError || heightError);

  return {
    canSubmit: !hasFieldErrors && (quantityValid || volumeValid),
    quantity: quantityValue,
    quantityText: quantityValue !== null ? String(quantityValue) : rawQuantity,
    length: lengthValue,
    width: widthValue,
    height: heightValue,
    volume,
    hasAnyDimension,
    hasAllDimensions,
    quantityValid,
    volumeValid,
    quantityError,
    lengthError,
    widthError,
    heightError,
    formError
  };
}
