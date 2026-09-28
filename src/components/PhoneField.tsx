"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
  if (!value) return fallback;
  try {
    const parsed = parsePhoneNumber(value);
    if (parsed?.countryCallingCode) return parsed.countryCallingCode;
  } catch { /* ignore */ }
  const match = value.match(/^\+(\d{1,3})/);
  return match?.[1] ?? fallback;
}

function phoneInputValue(value: string): Value | undefined {
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  return value as Value;
}

const COUNTRY_LABELS: Record<string, string> = {
  AZ: "Azərbaycan", TR: "Türkiyə", GE: "Gürcüstan",
  RU: "Rusiya", KZ: "Qazaxıstan", UA: "Ukrayna",
  DE: "Almaniya", AE: "BƏƏ", US: "ABŞ", GB: "Britaniya"
};

const ALLOWED_COUNTRIES: Country[] = ["AZ", "TR", "GE", "RU", "KZ", "UA", "DE", "AE", "US", "GB"];

type CountrySelectProps = {
  value?: Country;
  onChange: (country: Country) => void;
  options: { value: Country | "" | undefined; label: string }[];
  disabled?: boolean;
  iconComponent?: React.ComponentType<{ country: Country; label: string }>;
};

function CountrySelectDropdown({ value, onChange, iconComponent: FlagIcon, disabled }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const selectedCode = value ? (() => { try { return `+${getCountryCallingCode(value)}`; } catch { return ""; } })() : "";

  return (
    <div ref={rootRef} className="pf-country-root" style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="pf-country-btn"
      >
        {value && FlagIcon ? (
          <span className="pf-flag">
            <FlagIcon country={value} label={COUNTRY_LABELS[value] ?? value} />
          </span>
        ) : (
          <span className="pf-flag pf-flag-empty" />
        )}
        <span className="pf-calling-code">{selectedCode}</span>
        <svg className={`pf-chevron${open ? " pf-chevron-open" : ""}`} viewBox="0 0 10 6" fill="none" width="10" height="10">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="pf-dropdown" role="listbox">
          {ALLOWED_COUNTRIES.map(country => {
            const code = (() => { try { return `+${getCountryCallingCode(country)}`; } catch { return ""; } })();
            const isSelected = country === value;
            return (
              <button
                key={country}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`pf-option${isSelected ? " pf-option-selected" : ""}`}
                onClick={() => { onChange(country); close(); }}
              >
                <span className="pf-flag">
                  {FlagIcon && <FlagIcon country={country} label={COUNTRY_LABELS[country] ?? country} />}
                </span>
                <span className="pf-option-label">{COUNTRY_LABELS[country] ?? country}</span>
                <span className="pf-option-code">{code}</span>
                {isSelected && (
                  <svg className="pf-check" viewBox="0 0 12 10" fill="none" width="12" height="12">
                    <path d="M1 5l3.5 3.5L11 1" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
          countries={ALLOWED_COUNTRIES}
          countryCallingCodeEditable={false}
          flags={flags}
          value={phoneInputValue(value)}
          onChange={(next) => onChange(next ?? "")}
          disabled={disabled}
          placeholder={placeholder}
          countrySelectComponent={CountrySelectDropdown}
          numberInputProps={{
            name: name ? `${name}Visible` : undefined,
            autoComplete: "tel",
            inputMode: "tel",
            "aria-label": label,
            "aria-invalid": error ? true : undefined
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