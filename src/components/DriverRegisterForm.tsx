"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/FormInput";

const requiredFields = [
  "firstName",
  "lastName",
  "phone",
  "whatsappPhone",
  "city",
  "vehicleType",
  "brand",
  "model",
  "plateNumber",
  "capacityTons",
  "bodyLength",
  "bodyWidth",
  "bodyHeight",
  "workingDays",
  "workingHours",
  "routes",
  "notificationChannels"
];

export function DriverRegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
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

    setErrors({});

    const response = await fetch("/api/auth/register/driver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        whatsappPhone: String(formData.get("whatsappPhone") ?? ""),
        city: String(formData.get("city") ?? ""),
        vehicleType: String(formData.get("vehicleType") ?? ""),
        brand: String(formData.get("brand") ?? ""),
        model: String(formData.get("model") ?? ""),
        plateNumber: String(formData.get("plateNumber") ?? ""),
        capacityTons: String(formData.get("capacityTons") ?? ""),
        bodyLength: String(formData.get("bodyLength") ?? ""),
        bodyWidth: String(formData.get("bodyWidth") ?? ""),
        bodyHeight: String(formData.get("bodyHeight") ?? ""),
        workingDays: String(formData.get("workingDays") ?? ""),
        workingHours: String(formData.get("workingHours") ?? ""),
        routes: String(formData.get("routes") ?? ""),
        notificationChannels: String(formData.get("notificationChannels") ?? "WHATSAPP,SMS,CALL"),
        consentToReceiveOffers: formData.get("consentToReceiveOffers") === "on"
      })
    });
    const result = await response.json();
    setIsLoading(false);

    if (!response.ok || !result.ok) {
      setServerError(result.message ?? "Qeydiyyat alınmadı.");
      return;
    }

    router.push("/driver/success");
  }

  return (
    <form onSubmit={submit} className="form-card">
      {serverError ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="firstName" label="Ad" error={errors.firstName} />
        <FormInput name="lastName" label="Soyad" error={errors.lastName} />
        <FormInput name="phone" label="Telefon" placeholder="+994..." error={errors.phone} />
        <FormInput name="whatsappPhone" label="WhatsApp nömrəsi" placeholder="+994..." error={errors.whatsappPhone} />
        <FormInput name="city" label="Yaşadığı şəhər/rayon" placeholder="Bakı" error={errors.city} />
        <FormInput name="vehicleType" label="Maşın növü" placeholder="Ford Transit" error={errors.vehicleType} />
        <FormInput name="brand" label="Marka" placeholder="Ford" error={errors.brand} />
        <FormInput name="model" label="Model" placeholder="Transit" error={errors.model} />
        <FormInput name="plateNumber" label="Dövlət nömrə nişanı" placeholder="10-AB-123" error={errors.plateNumber} />
        <FormInput name="capacityTons" label="Yükgötürmə tonnajı" type="number" step="0.1" error={errors.capacityTons} />
        <FormInput name="bodyLength" label="Kuzanın uzunluğu" type="number" step="0.1" error={errors.bodyLength} />
        <FormInput name="bodyWidth" label="Kuzanın eni" type="number" step="0.1" error={errors.bodyWidth} />
        <FormInput name="bodyHeight" label="Kuzanın hündürlüyü" type="number" step="0.1" error={errors.bodyHeight} />
        <FormInput name="workingDays" label="İşlədiyi günlər" placeholder="Bazar ertəsi, Çərşənbə, Şənbə" error={errors.workingDays} />
        <FormInput name="workingHours" label="İşlədiyi saatlar" placeholder="09:00 - 19:00" error={errors.workingHours} />
        <FormInput name="routes" label="İşlədiyi istiqamətlər" placeholder="Bakı, Gəncə, Şəki" error={errors.routes} />
        <FormInput name="notificationChannels" label="Bildiriş kanalları" placeholder="WHATSAPP, SMS, CALL" error={errors.notificationChannels} />
      </div>
      <label className="checkbox-card">
        <input name="consentToReceiveOffers" type="checkbox" defaultChecked />
        Mən yükləri WhatsApp/SMS/zəng ilə almaq istəyirəm
      </label>
      <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
        {isLoading ? "Göndərilir..." : "Sürücü kimi qeydiyyatdan keç"}
      </Button>
    </form>
  );
}
