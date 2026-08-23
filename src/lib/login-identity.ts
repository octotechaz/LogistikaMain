/**
 * Login identity helpers — email or phone across all PhoneField countries.
 */
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/** Same allowlist as PhoneField — keep in sync. */
export const LOGIN_PHONE_COUNTRIES: CountryCode[] = [
  "AZ",
  "TR",
  "GE",
  "RU",
  "KZ",
  "UA",
  "DE",
  "AE",
  "US",
  "GB",
];

export function isEmailIdentity(raw: string): boolean {
  return raw.includes("@");
}

/** Digits only. */
export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Every plausible E.164 reading of the input across supported countries.
 * Prefers isValid(); falls back to isPossible() only when nothing is valid.
 */
export function phoneInterpretations(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || isEmailIdentity(trimmed)) return [];

  const valid = new Set<string>();
  const possible = new Set<string>();

  const consider = (value: string, defaultCountry?: CountryCode) => {
    const parsed = defaultCountry
      ? parsePhoneNumberFromString(value, defaultCountry)
      : parsePhoneNumberFromString(value);
    if (!parsed?.number) return;
    if (parsed.isValid()) valid.add(parsed.number);
    else if (parsed.isPossible()) possible.add(parsed.number);
  };

  // Explicit international form first
  if (trimmed.startsWith("+")) {
    consider(trimmed);
  }

  for (const country of LOGIN_PHONE_COUNTRIES) {
    consider(trimmed, country);
  }

  // Digits-only international / local forms
  const digits = phoneDigits(trimmed);
  if (digits) {
    // Only add +digits when there is no trunk 0 (otherwise +0546… is garbage)
    if (!digits.startsWith("0")) {
      consider(`+${digits}`);
    }
    for (const country of LOGIN_PHONE_COUNTRIES) {
      consider(digits, country);
      if (!digits.startsWith("0")) {
        consider(`0${digits}`, country);
      }
    }
  }

  if (valid.size > 0) return [...valid];
  return [...possible];
}

/**
 * Single best E.164 for client submit. Uses all-country interpretations.
 */
export function canonicalizeLoginPhone(raw: string): string | null {
  const interpretations = phoneInterpretations(raw);
  if (interpretations.length === 0) return null;
  if (interpretations.length === 1) return interpretations[0];

  // Ambiguous local input — prefer markets we actually serve
  const preferPrefix = ["+994", "+90", "+995", "+7", "+380", "+49", "+971", "+1", "+44"];
  for (const prefix of preferPrefix) {
    const hit = interpretations.find((n) => n.startsWith(prefix));
    if (hit) return hit;
  }
  return interpretations[0];
}

/** AZ national 9-digit helper (only for +994 numbers / AZ local forms). */
export function azNationalDigits(raw: string): string | null {
  const digits = phoneDigits(raw);
  if (!digits) return null;

  if (digits.startsWith("994") && digits.length >= 12) {
    return digits.slice(-9);
  }
  if (digits.startsWith("0") && digits.length === 10) {
    // Could be AZ or other — only treat as AZ national when remaining is 9 digits
    return digits.slice(1);
  }
  if (digits.length === 9) {
    return digits;
  }
  return null;
}

/**
 * Exact phone strings to try against User.phone.
 */
export function phoneLookupCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const interpretations = phoneInterpretations(trimmed);
  const out = new Set<string>();

  if (trimmed) out.add(trimmed);
  for (const e164 of interpretations) {
    out.add(e164);
    const digits = phoneDigits(e164);
    out.add(digits);
    out.add(`+${digits}`);
  }

  const digits = phoneDigits(trimmed);
  if (digits) {
    out.add(digits);
    // Never invent "+0…" — trunk-prefix locals must go through country parse first
    if (!digits.startsWith("0")) {
      out.add(`+${digits}`);
    }
  }

  return [...out].filter(Boolean);
}

/**
 * Digit forms for SQL regexp_replace equality (full international digits).
 */
export function phoneDigitMatchValues(raw: string): string[] {
  const out = new Set<string>();
  for (const e164 of phoneInterpretations(raw)) {
    out.add(phoneDigits(e164));
  }
  const digits = phoneDigits(raw);
  if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith("0")) {
    out.add(digits);
  }
  return [...out];
}
