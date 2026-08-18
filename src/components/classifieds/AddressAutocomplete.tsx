"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type PlaceResult = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
};

interface AddressAutocompleteProps {
  name: string;
  label: React.ReactNode;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  onFieldChange?: () => void;
}

export function AddressAutocomplete({
  name,
  label,
  defaultValue = "",
  required,
  error,
  onFieldChange
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (defaultValue) {
      setSelected({ label: defaultValue, address: defaultValue, latitude: 0, longitude: 0 });
    }
  }, [defaultValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  async function searchPlaces(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setPlaces([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/geocode/search?q=${encodeURIComponent(trimmed)}`,
        { cache: "no-store" }
      );
      const result = await response.json().catch(() => null);
      const list = result?.data?.places ?? [];
      setPlaces(list);
      setOpen(list.length > 0);
    } catch {
      setPlaces([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchPlaces(value), 350);
    onFieldChange?.();
  }

  function handlePick(place: PlaceResult) {
    setSelected(place);
    setQuery("");
    setPlaces([]);
    setOpen(false);
    onFieldChange?.();
  }

  const submittedValue = selected ? selected.address : query;

  return (
    <div className="form-group mb-0">
      <label className="text-[13px] font-semibold text-slate-600 mb-1.5 block">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>

      <div ref={containerRef} className="relative">
        <div className="relative w-full">
          <input
            type="text"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Tam ünvanı daxil edin"
            autoComplete="off"
            aria-label={typeof label === "string" ? label : name}
            style={{ height: 60 }}
            className={cn(
              "w-full rounded-[15px] border bg-white pr-14 pl-4 text-[16px] text-slate-800 shadow-sm transition-shadow outline-none placeholder:text-[18px] placeholder:text-slate-400",
              error
                ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15"
                : "border-[#d9dfe5] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
            )}
          />

          <input
            type="hidden"
            name={name}
            value={submittedValue}
            required={required}
          />

          <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center gap-1.5">
            {selected ? (
              <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[13px] font-semibold leading-tight text-emerald-600 whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="truncate">{selected.label}</span>
              </span>
            ) : (
              <MapPin className="h-[22px] w-[22px] shrink-0 text-emerald-500" />
            )}
          </div>
        </div>

        {loading ? (
          <div className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 flex items-center">
            <i className="ri-loader-4-line ri-spin text-slate-400"></i>
          </div>
        ) : null}

        {open && places.length > 0 ? (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[15px] border border-slate-200 bg-white shadow-xl">
            {places.map((place, index) => (
              <button
                key={`${place.address}-${index}`}
                type="button"
                onClick={() => handlePick(place)}
                className="flex w-full items-start gap-2.5 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-blue-50/60"
              >
                <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-emerald-500" />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-slate-800">
                    {place.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-slate-500">
                    {place.address}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error && (
        <span className="text-[12px] font-medium text-red-600 mt-1 block flex items-center gap-1">
          <i className="ri-error-warning-line"></i> {error}
        </span>
      )}
    </div>
  );
}