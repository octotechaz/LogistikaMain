"use client";

import { useMemo } from "react";
import PhoneInput, {
  type Country,
  type Value,
  getCountryCallingCode,
  parsePhoneNumber
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { inferPhoneCountry } from "@/lib/phone-validation";
import { cn } from "@/lib/utils";

/** @deprecated Prefer storing E.164 via PhoneField value directly. */
export function toE164(countryCode: string, localValue: string) {
  let digits = localValue.replace(/\D/g, "");
  if (digits.startsWith(countryCode)) {
    digits = digits.slice(countryCode.length);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits ? `+${countryCode}${digits}` : "";
}

export function phoneCountryCallingCode(value?: string | null, fallback = "994") {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = parsePhoneNumber(value);
    if (parsed?.countryCallingCode) {
      return parsed.countryCallingCode;
    }
  } catch {
    // ignore
  }

  const match = value.match(/^\+(\d{1,3})/);
  return match?.[1] ?? fallback;
}

function phoneInputValue(value: string): Value | undefined {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }

  return value as Value;
}

export function PhoneField({
  label,
  name,
  value,
  onChange,
  disabled = false,
  error,
  defaultCountry = "AZ",
  placeholder = "50 123 45 67",
  className
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  defaultCountry?: Country;
  placeholder?: string;
  className?: string;
}) {
  const resolvedCountry = useMemo(
    () => inferPhoneCountry(value, defaultCountry),
    [value, defaultCountry]
  );

  return (
    <label className={cn("form-label", className)}>
      {label}
      {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
      <div
        className={cn(
          "phone-field mt-1.5",
          disabled && "pointer-events-none opacity-60",
          error && "phone-field-error"
        )}
      >
        <PhoneInput
          international
          defaultCountry={resolvedCountry}
          countries={["AZ", "TR", "GE", "RU", "KZ", "UA", "DE", "AE", "US", "GB"]}
          countryCallingCodeEditable={false}
          flags={flags}
          value={phoneInputValue(value)}
          onChange={(next) => onChange(next ?? "")}
          disabled={disabled}
          placeholder={placeholder}
          numberInputProps={{
            name: name ? `${name}Visible` : undefined,
            autoComplete: "tel",
            inputMode: "tel",
            "aria-label": label,
            "aria-invalid": error ? true : undefined
          }}
          countrySelectProps={{
            unicodeFlags: false
          }}
        />
      </div>
      {error ? <span className="mt-1 text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

export function getDefaultPhonePrefix(country: Country = "AZ") {
  try {
    return `+${getCountryCallingCode(country)}`;
  } catch {
    return "+994";
  }
}
