"use client";

import { Check, MapPin, MessageCircle, Package, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { CarrierLocationPicker } from "@/components/CarrierLocationPicker";
import { PhoneField } from "@/components/PhoneField";
import { Button } from "@/components/ui/Button";
import { cargoTypes, vehicleTypes } from "@/lib/constants";
import { PASSWORD_POLICY } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

type PublicRegisterRole = "CARRIER" | "CARGO_OWNER";

type FieldErrors = Record<string, string>;

function parseFieldErrors(details: unknown): FieldErrors {
  if (!Array.isArray(details)) {
    return {};
  }

  return details.reduce<FieldErrors>((accumulator, item) => {
    if (
      item &&
      typeof item === "object" &&
      "field" in item &&
      typeof item.field === "string" &&
      "message" in item &&
      typeof item.message === "string"
    ) {
      accumulator[item.field] = item.message;
    }

    return accumulator;
  }, {});
}

function UnitField({
  label,
  name,
  unit,
  placeholder,
  type = "text",
  step,
  min,
  required = false,
  error
}: {
  label: string;
  name: string;
  unit: string;
  placeholder?: string;
  type?: string;
  step?: string;
  min?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="form-label">
      {label}
      <div className="relative">
        <input
          name={name}
          type={type}
          step={step}
          min={min}
          required={required}
          placeholder={placeholder}
          className={cn("form-field pr-14", error && "border-red-300 focus:border-red-500 focus:ring-red-100")}
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500">
          {unit}
        </span>
      </div>
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

function TextField({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  error
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="form-label">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className={cn("form-field", error && "border-red-300 focus:border-red-500 focus:ring-red-100")}
      />
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

export function RegisterForm({ role }: { role: PublicRegisterRole }) {
  const isCarrier = role === "CARRIER";
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCargoTypes, setSelectedCargoTypes] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{
    label: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  const carrierHighlights = useMemo(
    () => [
      "Elan verə bilməz, amma aktiv yükləri izləyib uyğun elanları seçilmişlərə əlavə edə bilər.",
      "WhatsApp və əlaqə nömrəsi ilə yük sahibləri ilə rahat əlaqə qurmaq üçün profil tamlanır.",
      "Avtomobil növü, daşıdığı yük növləri, həcm və çəki limiti sonradan uyğunlaşmada istifadə olunur."
    ],
    []
  );

  function toggleCargoType(value: string) {
    setSelectedCargoTypes((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    const { canonicalizeLoginPhone } = await import("@/lib/login-identity");
    const canonicalPhone = canonicalizeLoginPhone(phone);
    if (!canonicalPhone) {
      setError("Telefon nömrəsini düzgün daxil edin.");
      setIsLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      phone: canonicalPhone,
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      role
    };

    if (isCarrier) {
      const canonicalWhatsapp = canonicalizeLoginPhone(whatsappPhone) || canonicalPhone;
      payload.whatsappPhone = canonicalWhatsapp;
      payload.vehicleType = String(formData.get("vehicleType") ?? "");
      payload.supportedCargoTypes = selectedCargoTypes;
      payload.cargoSpaceVolumeM3 = String(formData.get("cargoSpaceVolumeM3") ?? "");
      payload.maxWeightTons = String(formData.get("maxWeightTons") ?? "");
      payload.locationAddress = String(formData.get("locationAddress") ?? "");
      payload.locationLabel = selectedLocation?.label ?? "";
      payload.locationLat = selectedLocation?.latitude ?? "";
      payload.locationLng = selectedLocation?.longitude ?? "";
    }

    const response = await fetch(role === "CARGO_OWNER" ? "/api/auth/register/cargo-owner" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok || !result?.ok) {
      setFieldErrors(parseFieldErrors(result?.details));
      setError(result?.message ?? "Qeydiyyat tamamlanmadı.");
      return;
    }

    const { redirectAfterToast } = await import("@/lib/toast");
    redirectAfterToast(
      "Qeydiyyat uğurla tamamlandı. Yönləndirilir...",
      result.data.redirectTo || "/",
      2500
    );
  }

  return (
    <form onSubmit={onSubmit} className="form-card max-w-[1040px]" aria-busy={isLoading}>
      <div>
        <p className="text-sm font-semibold text-logistics-orange">{isCarrier ? "Yük daşıyan" : "Yük sahibi"}</p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">Qeydiyyat</h1>
        <p className="mt-2 text-sm text-slate-600">
          {isCarrier
            ? "Daşıyıcı profilinizi tamamlayın, uyğun yükləri izləyin və seçilmiş elanları kabinetinizdə toplayın."
            : "Məlumatları daxil edin və hesabınızı yaradın."}
        </p>
      </div>

      {isCarrier ? (
        <div className="grid gap-3 rounded-[18px] border border-orange-100 bg-orange-50/60 p-4 text-sm text-slate-700 md:grid-cols-3">
          {carrierHighlights.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-[14px] bg-white/80 px-3 py-3 shadow-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-logistics-orange" />
              <span className="leading-6">{item}</span>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Ad" name="firstName" placeholder="Adınız" required error={fieldErrors.firstName} />
        <TextField label="Soyad" name="lastName" placeholder="Soyadınız" required error={fieldErrors.lastName} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PhoneField
          label={isCarrier ? "Əlaqə nömrəsi" : "Telefon nömrəsi"}
          name="phone"
          value={phone}
          onChange={setPhone}
          disabled={isLoading}
          error={fieldErrors.phone}
        />
        {isCarrier ? (
          <PhoneField
            label="Aktiv WhatsApp nömrəsi"
            name="whatsappPhone"
            value={whatsappPhone}
            onChange={setWhatsappPhone}
            disabled={isLoading}
            error={fieldErrors.whatsappPhone}
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Email"
          name="email"
          type="email"
          placeholder="email@example.com"
          required={!isCarrier}
          error={fieldErrors.email}
        />
        <TextField
          label="Şifrə"
          name="password"
          type="password"
          placeholder={`Minimum ${PASSWORD_POLICY.minimumLength} simvol`}
          required
          error={fieldErrors.password}
        />
        <p className="-mt-2 text-xs leading-5 text-slate-500 sm:col-start-2">{PASSWORD_POLICY.recommendation}</p>
      </div>

      <TextField label="Şirkət adı" name="companyName" placeholder="Məsələn, Araz Logistics" error={fieldErrors.companyName} />

      {isCarrier ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="form-label">
              Avtomobil növü
              <div className="relative">
                <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  name="vehicleType"
                  required
                  className={cn(
                    "form-field pl-10",
                    fieldErrors.vehicleType && "border-red-300 focus:border-red-500 focus:ring-red-100"
                  )}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Seçin
                  </option>
                  {vehicleTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.vehicleType ? (
                <span className="text-xs font-medium text-red-600">{fieldErrors.vehicleType}</span>
              ) : null}
            </label>

            <TextField
              label="Yerləşmə ünvanı"
              name="locationAddress"
              placeholder="Məsələn, Bakı, Babək prospekti 24"
              required
              error={fieldErrors.locationAddress}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <UnitField
              label="Yük yeri həcmi"
              name="cargoSpaceVolumeM3"
              unit="m³"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Məsələn, 32"
              required
              error={fieldErrors.cargoSpaceVolumeM3}
            />
            <UnitField
              label="Maksimal daşıma çəkisi"
              name="maxWeightTons"
              unit="ton"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Məsələn, 18"
              required
              error={fieldErrors.maxWeightTons}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <Package className="h-4 w-4 text-logistics-orange" />
              Hansı yükləri daşıya bilər
            </div>
            <div className="flex flex-wrap gap-3">
              {cargoTypes.map((type) => {
                const active = selectedCargoTypes.includes(type);

                return (
                  <label
                    key={type}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                      active
                        ? "border-orange-200 bg-orange-50 text-logistics-orange shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={active}
                      onChange={() => toggleCargoType(type)}
                    />
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                        active ? "border-orange-200 bg-logistics-orange text-white" : "border-slate-300 text-transparent"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    {type}
                  </label>
                );
              })}
            </div>
            {fieldErrors.supportedCargoTypes ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.supportedCargoTypes}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <MapPin className="h-4 w-4 text-logistics-orange" />
              Xəritədə yerləşmə
            </div>
            <CarrierLocationPicker
              selectedLabel={selectedLocation?.label ?? ""}
              selectedLatitude={selectedLocation?.latitude}
              selectedLongitude={selectedLocation?.longitude}
              onSelect={setSelectedLocation}
              error={fieldErrors.locationLabel || fieldErrors.locationLat || fieldErrors.locationLng}
            />
          </div>
        </>
      ) : null}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          "Göndərilir..."
        ) : (
          <>
            {isCarrier ? <MessageCircle className="h-4 w-4" /> : null}
            Hesab yarat
          </>
        )}
      </Button>
    </form>
  );
}
