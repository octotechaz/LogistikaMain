"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormInput, FormTextarea } from "@/components/FormInput";

const requiredFields = ["firstName", "lastName", "phone", "whatsappPhone", "companyName", "vehicleCount", "routes", "vehicleTypes"];

export function DispatcherRegisterForm() {
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
    const response = await fetch("/api/auth/register/dispatcher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        whatsappPhone: String(formData.get("whatsappPhone") ?? ""),
        companyName: String(formData.get("companyName") ?? ""),
        vehicleCount: String(formData.get("vehicleCount") ?? ""),
        routes: String(formData.get("routes") ?? ""),
        vehicleTypes: String(formData.get("vehicleTypes") ?? ""),
        note: String(formData.get("note") ?? "")
      })
    });
    const result = await response.json();
    setIsLoading(false);

    if (!response.ok || !result.ok) {
      setServerError(result.message ?? "Qeydiyyat alınmadı.");
      return;
    }

    router.push("/dispatcher/success");
  }

  return (
    <form onSubmit={submit} className="form-card">
      {serverError ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="firstName" label="Ad" error={errors.firstName} />
        <FormInput name="lastName" label="Soyad" error={errors.lastName} />
        <FormInput name="phone" label="Telefon" placeholder="+994..." error={errors.phone} />
        <FormInput name="whatsappPhone" label="WhatsApp nömrəsi" placeholder="+994..." error={errors.whatsappPhone} />
        <FormInput name="companyName" label="Şirkət və ya komanda adı" error={errors.companyName} />
        <FormInput name="vehicleCount" label="İdarə etdiyi maşın sayı" type="number" error={errors.vehicleCount} />
        <FormInput name="routes" label="Əsas istiqamətlər" placeholder="Bakı, Gəncə, Qəbələ" error={errors.routes} />
        <FormInput name="vehicleTypes" label="Maşın növləri" placeholder="TIR, Kamaz, Ford Transit" error={errors.vehicleTypes} />
      </div>
      <FormTextarea name="note" label="Qeyd" placeholder="Komanda haqqında əlavə məlumat..." />
      <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
        {isLoading ? "Göndərilir..." : "Dispetçer kimi qeydiyyatdan keç"}
      </Button>
    </form>
  );
}
