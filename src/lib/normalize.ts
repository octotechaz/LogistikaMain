export function emptyToNull(value: unknown) {
  return value === "" || value === undefined ? null : value;
}

export function numberOrNull(value: unknown) {
  const normalized = emptyToNull(value);

  if (normalized === null) {
    return null;
  }

  const numberValue = Number(normalized);
  return Number.isNaN(numberValue) ? null : numberValue;
}
