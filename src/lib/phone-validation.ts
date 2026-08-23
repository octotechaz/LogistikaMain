import { isValidPhoneNumber, parsePhoneNumber, type CountryCode } from "libphonenumber-js";

import { canonicalizeLoginPhone } from "@/lib/login-identity";

export function isValidInternationalPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (isValidPhoneNumber(trimmed)) {
    return true;
  }

  const canonical = canonicalizeLoginPhone(trimmed);
  return Boolean(canonical && isValidPhoneNumber(canonical));
}

export function normalizeInternationalPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isValidPhoneNumber(trimmed)) {
    return trimmed;
  }

  const canonical = canonicalizeLoginPhone(trimmed);
  if (canonical && isValidPhoneNumber(canonical)) {
    return canonical;
  }

  return null;
}

export function inferPhoneCountry(value: string, fallback: CountryCode = "AZ"): CountryCode {
  try {
    const parsed = parsePhoneNumber(value);
    if (parsed?.country) {
      return parsed.country;
    }
  } catch {
    // ignore
  }

  return fallback;
}
