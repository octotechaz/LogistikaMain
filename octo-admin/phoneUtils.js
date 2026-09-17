"use strict";

// Allowed separators: space, hyphen, dot, parentheses only.
// Slash, letters, and extra '+' signs are junk.
// A single leading '+' is valid only before 994.
const PHONE_ALLOWED_RE = /^\+?[\d\s().-]+$/;
const NATIONAL_DIGITS = 9;
const NORMALIZED_LENGTH = 12; // "994" + 9 digits
const SELECTABLE_COUNTRY_CODES = new Set(["994", "90", "995", "7"]);

/**
 * Normalize an AZ phone number to canonical "994XXXXXXXXX" form.
 * Accepts: +994…, 994…, 0XXXXXXXXX, XXXXXXXXX
 * Human separators (space, hyphen, dot, parens) are stripped first.
 * Throws an Error with /malformed/i message for any junk input.
 * @param {string} raw
 * @returns {string}
 */
function normalizeAzPhone(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`Malformed phone: "${raw}"`);
  }
  if (!PHONE_ALLOWED_RE.test(raw)) {
    throw new Error(`Malformed phone: "${raw}"`);
  }
  if (raw.indexOf("+") > 0) {
    throw new Error(`Malformed phone: "${raw}"`);
  }

  const digits = raw.replace(/\D/g, "");

  let national;
  if (digits.startsWith("994") && digits.length === NORMALIZED_LENGTH) {
    return digits;
  } else if (digits.startsWith("0") && digits.length === NATIONAL_DIGITS + 1) {
    // '+' prefix requires 994 country code — '+050…' is invalid
    if (raw.startsWith("+")) {
      throw new Error(`Malformed phone: "${raw}"`);
    }
    national = digits.slice(1);
  } else if (digits.length === NATIONAL_DIGITS) {
    if (raw.startsWith("+")) {
      throw new Error(`Malformed phone: "${raw}"`);
    }
    national = digits;
  } else {
    throw new Error(`Malformed phone: "${raw}"`);
  }

  return "994" + national;
}

/**
 * Normalize an international phone number to digits-only E.164 form.
 * Azerbaijan keeps its existing legacy canonical representation so existing
 * SQLite rows and OTP entries remain compatible.
 * @param {string} raw
 * @returns {string}
 */
function normalizeInternationalPhone(raw) {
  try {
    return normalizeAzPhone(raw);
  } catch {
    if (typeof raw !== "string" || raw.trim() === "" || !PHONE_ALLOWED_RE.test(raw) || raw.indexOf("+") > 0) {
      throw new Error(`Malformed phone: "${raw}"`);
    }
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15 || digits.startsWith("0") || digits.startsWith("994")) {
      throw new Error(`Malformed phone: "${raw}"`);
    }
    return digits;
  }
}

/**
 * Combine the country selected in the UI with a locally entered number.
 * The visible field is deliberately country-code-free; an already pasted
 * selected code is accepted without duplicating it.
 * @param {string} countryCode
 * @param {string} rawLocalNumber
 * @returns {string}
 */
function composeSelectedCountryPhone(countryCode, rawLocalNumber) {
  if (!SELECTABLE_COUNTRY_CODES.has(countryCode) || typeof rawLocalNumber !== "string" || rawLocalNumber.trim() === "") {
    throw new Error("Malformed phone");
  }
  if (!PHONE_ALLOWED_RE.test(rawLocalNumber) || rawLocalNumber.indexOf("+") > 0) {
    throw new Error(`Malformed phone: "${rawLocalNumber}"`);
  }

  let national = rawLocalNumber.replace(/\D/g, "");
  if (national.startsWith(countryCode)) {
    national = national.slice(countryCode.length);
  } else if (national.startsWith("0")) {
    national = national.slice(1);
  }

  return normalizeInternationalPhone(countryCode + national);
}

const OTP_RE = /^\d{6}$/;

/**
 * Validate and normalize the inputs for a send-otp or verify-otp request.
 * Returns { ok: true, phone: canonicalPhone } or { ok: false, message: string }.
 * Never throws.
 * @param {unknown} rawPhone
 * @param {unknown} [rawOtp]  — pass undefined to skip OTP validation
 * @returns {{ ok: boolean, phone?: string, message?: string }}
 */
function validateOtpInputs(rawPhone, rawOtp) {
  if (typeof rawPhone !== "string" || rawPhone.trim() === "") {
    return { ok: false, message: "Telefon nömrəsi tələb olunur." };
  }
  let phone;
  try {
    phone = normalizeInternationalPhone(rawPhone);
  } catch {
    return { ok: false, message: "Telefon nömrəsi düzgün deyil." };
  }
  if (rawOtp !== undefined) {
    if (typeof rawOtp !== "string" || !OTP_RE.test(rawOtp)) {
      return { ok: false, message: "OTP 6 rəqəmli olmalıdır." };
    }
  }
  return { ok: true, phone };
}

module.exports = { normalizeAzPhone, normalizeInternationalPhone, composeSelectedCountryPhone, validateOtpInputs };
