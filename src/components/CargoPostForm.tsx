"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CargoMeasurementFields } from "@/components/CargoMeasurementFields";
import { ImageUploader } from "@/components/ImageUploader";
import { Button } from "@/components/ui/Button";
import {
  formatVolume,
  normalizeQuantityValue,
  validateCargoMeasurements
} from "@/lib/cargo-measurements";
import {
  getMaxPickupDeadlineDateString,
  getBakuTodayDateString,
  normalizePickupDeadlineDateValue,
  pickupDeadlineRequiredMessage,
  validatePickupDeadlineDateValue
} from "@/lib/pickup-deadline";
import {
  getListingImageLimitHint,
  listingImageMaxFileSizeBytes,
  listingImageMaxFiles,
  listingImageMaxFilesMessage
} from "@/lib/listing-images";
import { azerbaijanLocations, cargoTypes, vehicleTypes } from "@/lib/constants";

function parseJsonArray(value: FormDataEntryValue | null) {
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return [];
  }
}

type CargoPostFormData = {
  id?: string;
  cargoName?: string;
  cargoType?: string;
  description?: string;
  weight?: number;
  volume?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  quantity?: string | null;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupCity?: string;
  deliveryCity?: string;
  pickupDate?: Date | string;
  pickupDeadlineDate?: Date | string;
  requiredVehicleType?: string;
  proposedPrice?: number | string | { toString(): string } | null;
  priceNegotiable?: boolean;
  contactPhone?: string;
  imageUrls?: string[];
};

function dateInputValue(value?: Date | string) {
  return normalizePickupDeadlineDateValue(value);
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function getFormError(result: { message?: string; details?: Array<{ message: string }> }) {
  if (result.details?.length) {
    return result.details.map((detail) => detail.message).join(" ");
  }

  return result.message ?? "Əməliyyat tamamlanmadı.";
}

type FieldErrorKey = "pickupAddress" | "deliveryAddress" | "pickupDeadlineDate";

function mapFieldErrors(
  details?: Array<{ field?: string; message: string }>
): Partial<Record<FieldErrorKey, string>> {
  const nextErrors: Partial<Record<FieldErrorKey, string>> = {};

  details?.forEach((detail) => {
    if (
      detail.field === "pickupAddress" ||
      detail.field === "deliveryAddress" ||
      detail.field === "pickupDeadlineDate"
    ) {
      nextErrors[detail.field] = detail.message;
    }
  });

  return nextErrors;
}

export function CargoPostForm({
  initialData,
  mode = "create"
}: {
  initialData?: CargoPostFormData;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldErrorKey, string>>>({});
  const [measurementErrors, setMeasurementErrors] = useState<
    Partial<Record<"quantity" | "length" | "width" | "height", string>>
  >({});
  const [measurements, setMeasurements] = useState({
    quantity: normalizeQuantityValue(initialData?.quantity),
    length: stringValue(initialData?.length),
    width: stringValue(initialData?.width),
    height: stringValue(initialData?.height)
  });

  const [dbCategories, setDbCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/public/categories");
        if (res.ok) {
          const payload = await res.json();
          if (payload.data) {
            setDbCategories(payload.data);
          }
        }
      } catch (e) {
        console.error("Failed to load categories", e);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  const measurementValidation = useMemo(
    () => validateCargoMeasurements(measurements),
    [measurements]
  );

  const volumeValue =
    measurementValidation.volume !== null ? formatVolume(measurementValidation.volume) : "";

  function updateMeasurement(
    field: keyof typeof measurements,
    value: string
  ) {
    setMeasurements((current) => ({
      ...current,
      [field]: value
    }));
    setMeasurementErrors((current) => ({
      ...current,
      [field]: undefined
    }));
    setError(null);
  }

  function updateFieldError(field: FieldErrorKey) {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined
    }));
    setError(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const nextMeasurementValidation = validateCargoMeasurements(measurements);
    const formData = new FormData(event.currentTarget);
    const pickupAddress = String(formData.get("pickupAddress") ?? "");
    const deliveryAddress = String(formData.get("deliveryAddress") ?? "");
    const pickupDeadlineDate = String(formData.get("pickupDeadlineDate") ?? "");
    const nextFieldErrors: Partial<Record<FieldErrorKey, string>> = {};

    if (pickupAddress.trim() === "") {
      nextFieldErrors.pickupAddress = "Yükləmə ünvanını daxil edin.";
    }

    if (deliveryAddress.trim() === "") {
      nextFieldErrors.deliveryAddress = "Boşaltma ünvanını daxil edin.";
    }

    const pickupDeadlineError = validatePickupDeadlineDateValue(pickupDeadlineDate);

    if (pickupDeadlineError) {
      nextFieldErrors.pickupDeadlineDate = pickupDeadlineError;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(Object.values(nextFieldErrors)[0] ?? pickupDeadlineRequiredMessage);
      setIsLoading(false);
      return;
    }

    if (!nextMeasurementValidation.canSubmit) {
      setMeasurementErrors({
        quantity: nextMeasurementValidation.quantityError,
        length: nextMeasurementValidation.lengthError,
        width: nextMeasurementValidation.widthError,
        height: nextMeasurementValidation.heightError
      });
      setError(
        nextMeasurementValidation.formError ||
          nextMeasurementValidation.quantityError ||
          nextMeasurementValidation.lengthError ||
          nextMeasurementValidation.widthError ||
          nextMeasurementValidation.heightError ||
          "Məlumatları yenidən yoxlayın."
      );
      setIsLoading(false);
      return;
    }
    const payload = {
      cargoName: String(formData.get("cargoName") ?? ""),
      cargoType: String(formData.get("cargoType") ?? ""),
      description: String(formData.get("description") ?? ""),
      weight: String(formData.get("weight") ?? ""),
      volume: volumeValue,
      length: measurements.length,
      width: measurements.width,
      height: measurements.height,
      quantity: nextMeasurementValidation.quantityValid
        ? String(nextMeasurementValidation.quantity)
        : "",
      pickupAddress: String(formData.get("pickupAddress") ?? ""),
      deliveryAddress: String(formData.get("deliveryAddress") ?? ""),
      pickupCity: String(formData.get("pickupCity") ?? ""),
      deliveryCity: String(formData.get("deliveryCity") ?? ""),
      pickupDeadlineDate,
      requiredVehicleType: String(formData.get("requiredVehicleType") ?? ""),
      proposedPrice: String(formData.get("proposedPrice") ?? ""),
      priceNegotiable: formData.get("priceNegotiable") === "on",
      contactPhone: String(formData.get("contactPhone") ?? ""),
      imageUrls: parseJsonArray(formData.get("imageUrls"))
    };

    if (payload.imageUrls.length > listingImageMaxFiles) {
      setError(listingImageMaxFilesMessage);
      setIsLoading(false);
      return;
    }

    const response = await fetch(
      mode === "edit" && initialData?.id
        ? `/api/cargo-posts/${initialData.id}`
        : "/api/cargo-posts",
      {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    const result = await response.json();

    setIsLoading(false);

    if (!response.ok || !result.ok) {
      setFieldErrors(mapFieldErrors(result.details));
      setError(getFormError(result));
      return;
    }

    router.push("/cargo-owner/cargo-posts");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-card">
      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-label">
          Yükün adı
          <input
            name="cargoName"
            className="form-field"
            placeholder="Tikinti materialları"
            defaultValue={initialData?.cargoName ?? ""}
            required
          />
        </label>
        <label className="form-label">
          Yükün növü (Kateqoriya)
          <select
            name="cargoType"
            className="form-field"
            defaultValue={initialData?.cargoType ?? ""}
            required
            disabled={isLoadingCategories}
          >
            <option value="">{isLoadingCategories ? "Yüklənir..." : "Seçin"}</option>
            {dbCategories.length > 0
              ? dbCategories.map((category) => (
                  <option key={category.id} value={category.label}>
                    {category.label}
                  </option>
                ))
              : cargoTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
          </select>
        </label>
      </div>

      <label className="form-label">
        Yükün təsviri
        <textarea
          name="description"
          className="form-field min-h-28"
          placeholder="Yük haqqında məlumat..."
          defaultValue={initialData?.description ?? ""}
          required
        />
      </label>

      <div className="grid gap-4">
        <label className="form-label max-w-sm">
          Çəki (ton)
          <input
            name="weight"
            type="number"
            step="0.1"
            min="0.1"
            className="form-field"
            defaultValue={initialData?.weight ?? ""}
            required
          />
        </label>

        <CargoMeasurementFields
          values={{
            ...measurements,
            volume: volumeValue
          }}
          errors={measurementErrors}
          onChange={updateMeasurement}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-label">
          Yükləmə ünvanı *
          <input
            name="pickupAddress"
            className="form-field"
            defaultValue={initialData?.pickupAddress ?? ""}
            required
            aria-label="Yükləmə ünvanı"
            onChange={() => updateFieldError("pickupAddress")}
          />
          {fieldErrors.pickupAddress ? (
            <span className="text-xs font-medium text-red-600">{fieldErrors.pickupAddress}</span>
          ) : null}
        </label>
        <label className="form-label">
          Boşaltma ünvanı *
          <input
            name="deliveryAddress"
            className="form-field"
            defaultValue={initialData?.deliveryAddress ?? ""}
            required
            aria-label="Boşaltma ünvanı"
            onChange={() => updateFieldError("deliveryAddress")}
          />
          {fieldErrors.deliveryAddress ? (
            <span className="text-xs font-medium text-red-600">{fieldErrors.deliveryAddress}</span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="form-label">
          Götürülmə şəhəri/rayonu
          <select
            name="pickupCity"
            className="form-field"
            defaultValue={initialData?.pickupCity ?? ""}
            required
          >
            <option value="">Seçin</option>
            {azerbaijanLocations.map((location) => (
              <option key={location}>{location}</option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Çatdırılma şəhəri/rayonu
          <select
            name="deliveryCity"
            className="form-field"
            defaultValue={initialData?.deliveryCity ?? ""}
            required
          >
            <option value="">Seçin</option>
            {azerbaijanLocations.map((location) => (
              <option key={location}>{location}</option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Ən gec götürülmə tarixi *
          <input
            name="pickupDeadlineDate"
            type="date"
            className="form-field"
            defaultValue={dateInputValue(initialData?.pickupDeadlineDate ?? initialData?.pickupDate)}
            min={getBakuTodayDateString()}
            max={getMaxPickupDeadlineDateString()}
            required
            aria-label="Ən gec götürülmə tarixi"
            onChange={() => updateFieldError("pickupDeadlineDate")}
          />
          <span className="text-xs font-medium text-slate-500">
            Bu gündən etibarən maksimum 30 gün sonrakı tarixi seçə bilərsiniz.
          </span>
          {fieldErrors.pickupDeadlineDate ? (
            <span className="text-xs font-medium text-red-600">{fieldErrors.pickupDeadlineDate}</span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="form-label">
          Ehtimal olunan nəqliyyat növü
          <select
            name="requiredVehicleType"
            className="form-field"
            defaultValue={initialData?.requiredVehicleType ?? ""}
            required
            aria-label="Ehtimal olunan nəqliyyat növü"
          >
            <option value="">Seçin</option>
            {vehicleTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Təklif olunan qiymət
          <input
            name="proposedPrice"
            type="number"
            step="1"
            min="1"
            className="form-field"
            defaultValue={stringValue(initialData?.proposedPrice)}
            aria-label="Təklif olunan qiymət"
          />
        </label>
        <label className="form-label">
          Əlaqə nömrəsi
          <input
            name="contactPhone"
            className="form-field"
            placeholder="+994..."
            defaultValue={initialData?.contactPhone ?? ""}
            required
          />
        </label>
      </div>

      <label className="checkbox-card max-w-md">
        <input
          type="checkbox"
          name="priceNegotiable"
          defaultChecked={initialData?.priceNegotiable}
        />
        Qiymət razılaşma ilə ola bilər
      </label>

      <ImageUploader
        name="imageUrls"
        folder="cargo-posts"
        label="Yük şəkilləri"
        initialUrls={initialData?.imageUrls}
        maxFiles={listingImageMaxFiles}
        maxFileSizeBytes={listingImageMaxFileSizeBytes}
        helperText={getListingImageLimitHint()}
      />

      <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
        {isLoading
          ? "Yadda saxlanılır..."
          : mode === "edit"
            ? "Yük elanını yenilə"
            : "Yük elanı yarat"}
      </Button>
    </form>
  );
}
