"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import {
  type Country,
  getCountryCallingCode,
  parsePhoneNumber
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { inferPhoneCountry } from "@/lib/phone-validation";
import { cn } from "@/lib/utils";

/** @deprecated Prefer storing E.164 via PhoneField value directly. */
export function toE164(countryCode: string, localValue: string) {
  let digits = localValue.replace(/\D/g, "");
  if (digits.startsWith(countryCode)) digits = digits.slice(countryCode.length);
  if (digits.startsWith("0")) digits = digits.slice(1);
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

const COUNTRY_LABELS: Record<string, string> = {
  AZ: "Azərbaycan", TR: "Türkiyə", GE: "Gürcüstan",
  RU: "Rusiya", KZ: "Qazaxıstan", UA: "Ukrayna",
  DE: "Almaniya", AE: "BƏƏ", US: "ABŞ", GB: "Britaniya"
};

const ALLOWED_COUNTRIES: Country[] = ["AZ", "TR", "GE", "RU", "KZ", "UA", "DE", "AE", "US", "GB"];

function getCallingCode(country: Country): string {
  try { return getCountryCallingCode(country); } catch { return ""; }
}

// E.164 → local input value (strip country calling code prefix)
function toLocalValue(e164: string, country: Country): string {
  const code = getCallingCode(country);
  if (!code) return e164;
  // Strip leading + and country code
  const withPlus = e164.startsWith("+") ? e164 : `+${e164}`;
  const prefix = `+${code}`;
  if (withPlus.startsWith(prefix)) {
    return withPlus.slice(prefix.length).replace(/^\s+/, "");
  }
  return e164;
}

// local input + country → E.164
function toE164FromLocal(local: string, country: Country): string {
  const code = getCallingCode(country);
  if (!code) return local;
  const digits = local.replace(/\D/g, "");
  if (!digits) return "";
  return `+${code}${digits}`;
}

// Country Dropdown
function CountryDropdown({
  value,
  onChange,
  disabled,
}: {
  value: Country;
  onChange: (c: Country) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const FlagIcon = flags[value];
  const code = getCallingCode(value);

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
        <span className="pf-flag">
          {FlagIcon ? <FlagIcon title={COUNTRY_LABELS[value] ?? value} /> : null}
        </span>
        <span className="pf-calling-code">+{code}</span>
        <svg className={`pf-chevron${open ? " pf-chevron-open" : ""}`} viewBox="0 0 10 6" fill="none" width="10" height="10">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="pf-dropdown" role="listbox">
          {ALLOWED_COUNTRIES.map(country => {
            const c = getCallingCode(country);
            const isSelected = country === value;
            const FlagC = flags[country];
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
                  {FlagC && <FlagC title={COUNTRY_LABELS[country] ?? country} />}
                </span>
                <span className="pf-option-label">{COUNTRY_LABELS[country] ?? country}</span>
                <span className="pf-option-code">+{c}</span>
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
  className,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultCountry]
  );

  const [country, setCountry] = useState<Country>(resolvedCountry);

  // Local input value — strip the country code prefix
  const localValue = useMemo(() => toLocalValue(value, country), [value, country]);

  function handleCountryChange(next: Country) {
    setCountry(next);
    // Mevcut local digits'i yeni country code ile yeniden E.164 yap
    const digits = localValue.replace(/\D/g, "");
    onChange(digits ? `+${getCallingCode(next)}${digits}` : "");
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d\s\-().]/g, "");
    onChange(toE164FromLocal(raw, country));
  }

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
        <div className="PhoneInput">
          <div className="PhoneInputCountry">
            <CountryDropdown value={country} onChange={handleCountryChange} disabled={disabled} />
          </div>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-label={label}
            aria-invalid={error ? true : undefined}
            name={name ? `${name}Visible` : undefined}
            placeholder={placeholder}
            disabled={disabled}
            value={localValue}
            onChange={handleInputChange}
            className="PhoneInputInput"
          />
        </div>
      </div>
      {error ? <span className="mt-1 text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

export function getDefaultPhonePrefix(country: Country = "AZ") {
  try { return `+${getCountryCallingCode(country)}`; }
  catch { return "+994"; }
}