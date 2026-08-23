"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormInput, FormTextarea } from "@/components/FormInput";

const requiredFields = [
  "title",
  "cargoType",
  "description",
  "weight",
  "pickupCity",
  "deliveryCity",
  "pickupAddress",
  "deliveryAddress",
  "pickupDate",
  "requiredVehicleType",
  "contactPhone"
];

export function CargoOwnerLoadForm({ contactPhone = "" }: { contactPhone?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setServerError(null);

    const formData = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};

    requiredFields.forEach((field) => {
      if (!String(formData.get(field) ?? "").trim()) {
        nextErrors[field] = "Bu sahə mütləqdir.";
      }
    });

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setIsLoading(false);
      return;
    }

    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/cargo-owner/loads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...payload,
        isNegotiable: formData.get("isNegotiable") === "on"
      })
    });
    const result = await response.json();
    setIsLoading(false);

    if (!response.ok || !result.ok) {
      const detailMessage = Array.isArray(result.details)
        ? result.details.map((item: { message?: string }) => item.message).filter(Boolean).join(" ")
        : "";
      if (Array.isArray(result.details)) {
        const fieldMap: Record<string, string> = {};
        for (const detail of result.details) {
          if (detail?.field && detail?.message) {
            fieldMap[detail.field] = detail.message;
          }
        }
        if (Object.keys(fieldMap).length) {
          setErrors(fieldMap);
        }
      }
      setServerError(detailMessage || result.message || "Yük yerləşdirilmədi.");
      return;
    }

    router.push(`/cargo-owner/loads/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-card">
      {serverError ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="title" label="Yükün adı" placeholder="Mebel daşınması" error={errors.title} />
        <FormInput name="cargoType" label="Yük tipi" placeholder="Mebel, kubik, ərzaq..." error={errors.cargoType} />
        <FormInput name="weight" label="Çəki / ton" type="number" step="0.1" error={errors.weight} />
        <FormInput name="volume" label="Həcm" type="number" step="0.1" error={errors.volume} />
        <FormInput name="length" label="Uzunluq" type="number" step="0.1" error={errors.length} />
        <FormInput name="width" label="En" type="number" step="0.1" error={errors.width} />
        <FormInput name="height" label="Hündürlük" type="number" step="0.1" error={errors.height} />
        <FormInput name="quantity" label="Say / miqdar" placeholder="20 palet" error={errors.quantity} />
        <FormInput name="pickupCity" label="Götürülmə şəhəri" placeholder="Bakı" error={errors.pickupCity} />
        <FormInput name="deliveryCity" label="Çatdırılma şəhəri" placeholder="Gəncə" error={errors.deliveryCity} />
        <FormInput name="pickupAddress" label="Götürülmə ünvanı" placeholder="Anbar, küçə, rayon" error={errors.pickupAddress} />
        <FormInput name="deliveryAddress" label="Çatdırılma ünvanı" placeholder="Çatdırılacaq ünvan" error={errors.deliveryAddress} />
        <FormInput name="pickupDate" label="Götürülmə tarixi" type="date" error={errors.pickupDate} />
        <FormInput name="pickupTime" label="Götürülmə saatı" type="time" />
        <FormInput name="requiredVehicleType" label="Tələb olunan maşın növü" placeholder="Ford Transit" error={errors.requiredVehicleType} />
        <FormInput name="contactPhone" label="Əlaqə nömrəsi" placeholder="+994..." defaultValue={contactPhone} error={errors.contactPhone} />
        <FormInput name="priceFrom" label="Qiymət min." type="number" step="1" />
        <FormInput name="priceTo" label="Qiymət max." type="number" step="1" />
      </div>
      <p className="text-sm text-slate-500">
        Say və ya uzunluq/en/hündürlük (hər üçü) mütləqdir — həcm avtomatik hesablanır.
      </p>
      <label className="checkbox-card">
        <input name="isNegotiable" type="checkbox" />
        Qiymət razılaşma ilə ola bilər
      </label>
      <FormTextarea name="description" label="Yükün təsviri" placeholder="Yükün detalları, yükləmə şərtləri..." error={errors.description} />
      <FormTextarea name="note" label="Operator üçün əlavə qeyd" placeholder="Məsələn: zəng üçün uyğun saat, giriş qaydası..." />
      <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
        {isLoading ? "Yerləşdirilir..." : "Yükü yerləşdir"}
      </Button>
    </form>
  );
}
