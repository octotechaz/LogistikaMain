import { createHash, timingSafeEqual } from "node:crypto";

export type VerifyResult = "ok" | "invalid" | "expired";

interface OtpEntry {
  hash: Buffer;
  expiresAt: number;
  failures: number;
}

const TTL_MS = 5 * 60 * 1000;
const MAX_FAILURES = 5;
// AZ national number: 9 digits; normalized form: "994" + 9 digits = 12 digits
const NATIONAL_DIGITS = 9;
const NORMALIZED_LENGTH = 12; // "994" + 9
const OTP_RE = /^\d{6}$/;

// Allowed non-digit separators: space, hyphen, dot, parentheses only.
// Slash, letters, extra '+' signs, etc. are rejected as junk.
// A single leading '+' is additionally allowed and only valid before 994.
const PHONE_ALLOWED_RE = /^\+?[\d\s().-]+$/;

export function normalizeAzPhone(raw: string): string {
  if (!PHONE_ALLOWED_RE.test(raw)) {
    throw new Error(`Malformed phone: "${raw}"`);
  }
  // '+' is only valid at position 0; reject if it appears elsewhere
  if (raw.indexOf("+") > 0) {
    throw new Error(`Malformed phone: "${raw}"`);
  }

  const digits = raw.replace(/\D/g, "");

  let national: string;
  if (digits.startsWith("994") && digits.length === NORMALIZED_LENGTH) {
    return digits;
  } else if (digits.startsWith("0") && digits.length === NATIONAL_DIGITS + 1) {
    // '+' prefix requires 994 country code — '+050…' and '+5…' are invalid
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

export function normalizeInternationalPhone(raw: string): string {
  try {
    return normalizeAzPhone(raw);
  } catch {
    if (!PHONE_ALLOWED_RE.test(raw) || raw.indexOf("+") > 0) {
      throw new Error(`Malformed phone: "${raw}"`);
    }
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15 || digits.startsWith("0") || digits.startsWith("994")) {
      throw new Error(`Malformed phone: "${raw}"`);
    }
    return digits;
  }
}

function validateCode(code: string): void {
  if (!OTP_RE.test(code)) {
    throw new Error(`Invalid OTP format: must be exactly 6 digits`);
  }
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export class OtpService {
  private readonly entries = new Map<string, OtpEntry>();
  private readonly now: () => number;

  constructor(clock: () => number = Date.now) {
    this.now = clock;
  }

  store(rawPhone: string, code: string): void {
    const phone = normalizeInternationalPhone(rawPhone);
    validateCode(code);
    this.entries.set(phone, {
      hash: sha256(code),
      expiresAt: this.now() + TTL_MS,
      failures: 0
    });
  }

  verify(rawPhone: string, code: string): VerifyResult {
    const phone = normalizeInternationalPhone(rawPhone);
    validateCode(code);

    const entry = this.entries.get(phone);

    if (!entry) return "invalid";

    if (this.now() > entry.expiresAt) {
      this.entries.delete(phone);
      return "expired";
    }

    const provided = sha256(code);
    const stored = entry.hash;
    // timingSafeEqual requires equal-length buffers; sha256 always produces 32 bytes
    const match = timingSafeEqual(provided, stored);

    if (!match) {
      entry.failures += 1;
      if (entry.failures >= MAX_FAILURES) {
        this.entries.delete(phone);
      }
      return "invalid";
    }

    this.entries.delete(phone);
    return "ok";
  }
}

export const otpService = new OtpService();
