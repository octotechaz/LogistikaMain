"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/ImageUploader";
import { azerbaijanLocations, vehicleTypes, workDays } from "@/lib/constants";

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

type VehicleFormData = {
  id?: string;
  vehicleType?: string;
  brand?: string;
  model?: string;
  plateNumber?: string;
  driverFirstName?: string;
  driverLastName?: string;
  driverPhone?: string;
  capacityTons?: number;
  bodyLength?: number;
  bodyWidth?: number;
  bodyHeight?: number;
  overallDimensions?: string;
  workDays?: string[];
  workHours?: string;
  serviceAreas?: string[];
  imageUrls?: string[];
  documentImageUrls?: string[];
};

function getFormError(result: { message?: string; details?: Array<{ message: string }> }) {
  if (result.details?.length) {
    return result.details.map((detail) => detail.message).join(" ");
  }

  return result.message ?? "Əməliyyat tamamlanmadı.";
}

export function VehicleForm({ initialData, mode = "create" }: { initialData?: VehicleFormData; mode?: "create" | "edit" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      vehicleType: String(formData.get("vehicleType") ?? ""),
      brand: String(formData.get("brand") ?? ""),
      model: String(formData.get("model") ?? ""),
      plateNumber: String(formData.get("plateNumber") ?? ""),
      driverFirstName: String(formData.get("driverFirstName") ?? ""),
      driverLastName: String(formData.get("driverLastName") ?? ""),
      driverPhone: String(formData.get("driverPhone") ?? ""),
      capacityTons: String(formData.get("capacityTons") ?? ""),
      bodyLength: String(formData.get("bodyLength") ?? ""),
      bodyWidth: String(formData.get("bodyWidth") ?? ""),
      bodyHeight: String(formData.get("bodyHeight") ?? ""),
      overallDimensions: String(formData.get("overallDimensions") ?? ""),
      workDays: formData.getAll("workDays").map(String),
      workHours: String(formData.get("workHours") ?? ""),
      serviceAreas: formData.getAll("serviceAreas").map(String),
      imageUrls: parseJsonArray(formData.get("imageUrls")),
      documentImageUrls: parseJsonArray(formData.get("documentImageUrls"))
    };

    const response = await fetch(mode === "edit" && initialData?.id ? `/api/vehicles/${initialData.id}` : "/api/vehicles", {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    setIsLoading(false);

    if (!response.ok || !result.ok) {
      setError(getFormError(result));
      return;
    }

    router.push("/carrier/vehicles");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-card">
      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="form-label">
          Avtomobilin növü
          <select name="vehicleType" className="form-field" defaultValue={initialData?.vehicleType ?? ""} required>
            <option value="">Seçin</option>
            {vehicleTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Marka
          <input name="brand" className="form-field" placeholder="Mercedes-Benz" defaultValue={initialData?.brand ?? ""} required />
        </label>
        <label className="form-label">
          Model
          <input name="model" className="form-field" placeholder="Actros" defaultValue={initialData?.model ?? ""} required />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="form-label">
          Dövlət nömrə nişanı
          <input name="plateNumber" className="form-field" placeholder="10-AB-123" defaultValue={initialData?.plateNumber ?? ""} required />
        </label>
        <label className="form-label">
          Sürücünün adı
          <input name="driverFirstName" className="form-field" defaultValue={initialData?.driverFirstName ?? ""} required />
        </label>
        <label className="form-label">
          Sürücünün soyadı
          <input name="driverLastName" className="form-field" defaultValue={initialData?.driverLastName ?? ""} required />
        </label>
      </div>

      <label className="form-label">
        Sürücünün telefon nömrəsi
        <input name="driverPhone" className="form-field" placeholder="+994..." defaultValue={initialData?.driverPhone ?? ""} required />
      </label>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="form-label">
          Tonnaj
          <input name="capacityTons" type="number" step="0.1" className="form-field" defaultValue={initialData?.capacityTons ?? ""} required />
        </label>
        <label className="form-label">
          Kuzanın uzunluğu
          <input name="bodyLength" type="number" step="0.1" className="form-field" defaultValue={initialData?.bodyLength ?? ""} required />
        </label>
        <label className="form-label">
          Kuzanın eni
          <input name="bodyWidth" type="number" step="0.1" className="form-field" defaultValue={initialData?.bodyWidth ?? ""} required />
        </label>
        <label className="form-label">
          Kuzanın hündürlüyü
          <input name="bodyHeight" type="number" step="0.1" className="form-field" defaultValue={initialData?.bodyHeight ?? ""} required />
        </label>
      </div>

      <label className="form-label">
        Ümumi qabarit ölçüləri
        <input name="overallDimensions" className="form-field" placeholder="13.6m x 2.45m x 2.7m" defaultValue={initialData?.overallDimensions ?? ""} required />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-navy-900">İşləmə günləri</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {workDays.map((day) => (
            <label key={day} className="checkbox-card">
              <input type="checkbox" name="workDays" value={day} defaultChecked={initialData?.workDays?.includes(day)} />
              {day}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="form-label">
        İşləmə saatları
        <input name="workHours" className="form-field" placeholder="09:00 - 19:00" defaultValue={initialData?.workHours ?? ""} required />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-navy-900">İşlədiyi şəhər/rayonlar</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {azerbaijanLocations.map((location) => (
            <label key={location} className="checkbox-card">
              <input
                type="checkbox"
                name="serviceAreas"
                value={location}
                defaultChecked={initialData?.serviceAreas?.includes(location)}
              />
              {location}
            </label>
          ))}
        </div>
      </fieldset>

      <ImageUploader name="imageUrls" folder="vehicles" label="Avtomobil şəkilləri" initialUrls={initialData?.imageUrls} />
      <ImageUploader
        name="documentImageUrls"
        folder="vehicle-documents"
        label="Sənəd şəkilləri"
        initialUrls={initialData?.documentImageUrls}
      />

      <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
        {isLoading ? "Yadda saxlanılır..." : mode === "edit" ? "Avtomobili yenilə" : "Avtomobili əlavə et"}
      </Button>
    </form>
  );
}
